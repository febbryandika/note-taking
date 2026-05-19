import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { logger } from '../lib/logger'
import * as schema from './schema'

const SLOW_QUERY_MS = Number(process.env.SLOW_QUERY_MS ?? '100')

const rawSql = neon(process.env.DATABASE_URL!)

// Drizzle's neon-http session ultimately invokes the neon callable as
// `client(queryString, params, options)`. Proxying the `apply` trap
// captures every issued query without touching Drizzle internals.
// Slow queries surface at WARN so they're visible without flipping
// LOG_LEVEL; normal queries stay at DEBUG to avoid prod log spam.
const sql = new Proxy(rawSql, {
  apply(target, thisArg, args) {
    const start = performance.now()
    const sqlPreview = previewSql(args[0]).slice(0, 200)
    const result = Reflect.apply(
      target as (...a: unknown[]) => unknown,
      thisArg,
      args,
    )
    if (!isPromise(result)) return result
    return result.then(
      (r) => {
        const durationMs = Math.round(performance.now() - start)
        const level = durationMs >= SLOW_QUERY_MS ? 'warn' : 'debug'
        logger[level]({ durationMs, sql: sqlPreview }, 'query')
        return r
      },
      (e: unknown) => {
        logger.warn(
          {
            durationMs: Math.round(performance.now() - start),
            sql: sqlPreview,
            error: e instanceof Error ? e.message : String(e),
          },
          'query.error',
        )
        throw e
      },
    )
  },
}) as typeof rawSql

function isPromise(v: unknown): v is Promise<unknown> {
  return !!v && typeof (v as { then?: unknown }).then === 'function'
}

function previewSql(arg: unknown): string {
  if (typeof arg === 'string') return arg
  // Tagged-template invocation passes a TemplateStringsArray as arg[0].
  if (Array.isArray(arg)) return arg.join('?')
  return ''
}

export const db = drizzle(sql, { schema })
