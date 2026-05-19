import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { csrf } from 'hono/csrf'
import { HTTPException } from 'hono/http-exception'
import { auth } from './lib/auth'
import { errorResponse } from './lib/errors'
import { logger, requestLogger } from './lib/logger'
import { requireAuth, type AuthVariables } from './lib/middleware'
import { methodLimit, rateLimit } from './lib/rateLimit'
import { securityHeaders } from './lib/securityHeaders'
import { notebooksRoute } from './routes/notebooks'
import { notesRoute } from './routes/notes'
import { tagsRoute } from './routes/tags'

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5177'

// Surface the connection-level IP from Bun.serve so the rate limiter can key
// on it without trusting an X-Forwarded-For we never wrote.
type Bindings = { ip: string | null }

export const app = new Hono<{ Bindings: Bindings }>()

const onBodyLimit = (c: Parameters<typeof errorResponse>[0]) =>
  errorResponse(c, 'PAYLOAD_TOO_LARGE', 'Request body too large')

app.use('*', requestLogger())
app.use('*', securityHeaders())
app.use(
  '*',
  cors({
    origin: FRONTEND_URL,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: [
      'Content-Length',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'Retry-After',
    ],
    maxAge: 600,
    credentials: true,
  }),
)
// CSRF: rejects non-safe methods whose Origin doesn't match the allowlist.
// Same-site `lax` cookies are the primary defense; this is belt-and-suspenders.
app.use('*', csrf({ origin: FRONTEND_URL }))

// Centralized error handler — never leak stack traces to clients.
// HTTPException (e.g. Hono csrf → 403) is intentional, so translate to our
// unified shape; everything else collapses to 500 without details.
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    const code =
      err.status === 403 ? 'FORBIDDEN' :
      err.status === 401 ? 'UNAUTHORIZED' :
      err.status === 404 ? 'NOT_FOUND' :
      err.status === 413 ? 'PAYLOAD_TOO_LARGE' :
      err.status === 429 ? 'RATE_LIMITED' :
      'BAD_REQUEST'
    return errorResponse(c, code, err.message || code.replace('_', ' ').toLowerCase())
  }
  logger.error(
    {
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      err,
    },
    'unhandled',
  )
  return errorResponse(c, 'INTERNAL', 'Internal server error')
})
app.notFound((c) => errorResponse(c, 'NOT_FOUND', 'Not found'))

// ── Auth boundary ────────────────────────────────────────────────────────────
// 16KB body cap (login/register payloads are tiny — anything bigger is junk).
// Only rate-limit POSTs (sign-in / sign-up / sign-out) — GET /get-session is
// called on every page load and shouldn't be throttled.
app.use(
  '/api/auth/*',
  bodyLimit({ maxSize: 16 * 1024, onError: onBodyLimit }),
  methodLimit(
    ['POST'],
    rateLimit({ name: 'auth', limit: 10, windowMs: 60_000, keyBy: 'ip' }),
  ),
)
app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw))

app.get('/api/health', (c) => c.json({ status: 'ok' }))

// ── Protected sub-app ────────────────────────────────────────────────────────
// Order: bodyLimit → auth → general user limit → mutation limit (POST/PUT/DELETE)
// → search limit (only matches /notes/search). Each rateLimit uses its own
// bucket name, so they don't share counters.
const api = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>()
  .use('*', bodyLimit({ maxSize: 1 * 1024 * 1024, onError: onBodyLimit }))
  .use('*', requireAuth)
  .use('*', rateLimit({ name: 'read', limit: 300, windowMs: 60_000, keyBy: 'user' }))
  .use(
    '*',
    methodLimit(
      ['POST', 'PUT', 'PATCH', 'DELETE'],
      // 2 req/sec sustained — comfortable for the 1s-debounced auto-save plus
      // user clicks (pin, tag toggle), still tight enough to block scripted abuse.
      rateLimit({ name: 'mutate', limit: 120, windowMs: 60_000, keyBy: 'user' }),
    ),
  )
  .use(
    '/notes/search',
    rateLimit({ name: 'search', limit: 30, windowMs: 60_000, keyBy: 'user' }),
  )
  .get('/me', (c) => {
    const user = c.get('user')
    return c.json({ user })
  })
  .route('/notebooks', notebooksRoute)
  .route('/notes', notesRoute)
  .route('/tags', tagsRoute)

const routes = app.route('/api', api)

// Export for RPC type inference
export type AppType = typeof routes

const port = Number(process.env.PORT ?? 3000)
console.log(`Server running on http://localhost:${port}`)

export default {
  port,
  // Bun passes the Server as the second arg so we can pull the connection IP.
  // We push it into Hono's bindings as `c.env.ip` for the rate limiter.
  fetch(req: Request, server: { requestIP(req: Request): { address: string } | null }) {
    const ip = server.requestIP(req)?.address ?? null
    return app.fetch(req, { ip })
  },
}
