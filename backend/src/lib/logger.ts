import type { MiddlewareHandler } from 'hono'
import { AsyncLocalStorage } from 'node:async_hooks'
import pino, { type Logger } from 'pino'

type RequestCtx = { requestId: string; userId?: string }

// AsyncLocalStorage propagates the per-request id/userId into anything
// reached during the request — DB queries deep in handlers can attach
// the same correlation fields without threading them through args.
export const requestContext = new AsyncLocalStorage<RequestCtx>()

const isProd = process.env.NODE_ENV === 'production'

export const logger: Logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  // JSON to stdout in prod (for aggregators); pino-pretty in dev (for humans).
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l', singleLine: true },
      },
  // Attach the in-flight requestId/userId to every record without callers
  // having to thread them through.
  mixin: () => {
    const ctx = requestContext.getStore()
    if (!ctx) return {}
    return ctx.userId
      ? { requestId: ctx.requestId, userId: ctx.userId }
      : { requestId: ctx.requestId }
  },
})

// Tight allow-list — we'd rather mint a fresh id than echo a hostile one.
const REQUEST_ID_RE = /^[A-Za-z0-9_-]{8,64}$/

// Outermost middleware: assigns a request id, runs the handler inside an
// AsyncLocalStorage context, and emits exactly one structured "request"
// line on completion with method/path/status/durationMs.
export function requestLogger(): MiddlewareHandler {
  return async (c, next) => {
    const inbound = c.req.header('x-request-id')
    const requestId =
      inbound && REQUEST_ID_RE.test(inbound) ? inbound : crypto.randomUUID()

    c.header('X-Request-Id', requestId)

    const ctx: RequestCtx = { requestId }
    const start = performance.now()

    await requestContext.run(ctx, async () => {
      try {
        await next()
      } finally {
        logger.info(
          {
            method: c.req.method,
            path: new URL(c.req.url).pathname,
            status: c.res.status,
            durationMs: Math.round(performance.now() - start),
          },
          'request',
        )
      }
    })
  }
}
