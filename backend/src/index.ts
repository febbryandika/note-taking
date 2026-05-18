import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { auth } from './lib/auth'
import { requireAuth, type AuthVariables } from './lib/middleware'
import { notebooksRoute } from './routes/notebooks'
import { notesRoute } from './routes/notes'
import { tagsRoute } from './routes/tags'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use(
  '*',
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5177',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  })
)

// Auth routes — better-auth handles /api/auth/**
app.on(['GET', 'POST'], '/api/auth/**', (c) => auth.handler(c.req.raw))

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok' }))

// Protected routes — chain so types flow into AppType for the Hono RPC client
const api = new Hono<{ Variables: AuthVariables }>()
  .use('*', requireAuth)
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
  fetch: app.fetch,
}
