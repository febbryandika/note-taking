import type { Context, MiddlewareHandler } from 'hono'
import { errorResponse } from './errors'

type Bucket = { tokens: number; resetAt: number }

const buckets = new Map<string, Bucket>()
const CLEANUP_INTERVAL_MS = 60_000

let cleanupHandle: ReturnType<typeof setInterval> | null = null
function ensureCleanup() {
  if (cleanupHandle) return
  cleanupHandle = setInterval(() => {
    const now = Date.now()
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
  }, CLEANUP_INTERVAL_MS)
  if (typeof (cleanupHandle as unknown as { unref?: () => void }).unref === 'function') {
    ;(cleanupHandle as unknown as { unref: () => void }).unref()
  }
}

type KeyMode = 'user' | 'ip'

export type RateLimitOptions = {
  // Bucket namespace — different middleware instances use different buckets
  // so a user's read budget and mutation budget are tracked separately.
  name: string
  limit: number
  windowMs: number
  keyBy: KeyMode
}

export function rateLimit(opts: RateLimitOptions): MiddlewareHandler {
  ensureCleanup()
  return async (c, next) => {
    const key = `${opts.name}:${keyOf(c, opts.keyBy)}`
    const now = Date.now()
    let bucket = buckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      bucket = { tokens: opts.limit, resetAt: now + opts.windowMs }
      buckets.set(key, bucket)
    }
    bucket.tokens -= 1

    c.header('X-RateLimit-Limit', String(opts.limit))
    c.header('X-RateLimit-Remaining', String(Math.max(0, bucket.tokens)))
    c.header('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)))

    if (bucket.tokens < 0) {
      const retrySec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
      c.header('Retry-After', String(retrySec))
      return errorResponse(c, 'RATE_LIMITED', 'Too many requests')
    }
    await next()
  }
}

// Run `mw` only when the request method matches; pass-through otherwise.
export function methodLimit(
  methods: readonly string[],
  mw: MiddlewareHandler,
): MiddlewareHandler {
  const set = new Set(methods.map((m) => m.toUpperCase()))
  return async (c, next) => {
    if (set.has(c.req.method)) return mw(c, next)
    return next()
  }
}

function keyOf(c: Context, mode: KeyMode): string {
  if (mode === 'user') {
    const user = c.get('user') as { id?: string } | undefined
    if (user?.id) return `user:${user.id}`
  }
  return `ip:${clientIp(c)}`
}

function clientIp(c: Context): string {
  const envIp = (c.env as { ip?: string | null } | undefined)?.ip
  if (envIp) return envIp
  const xff = c.req.header('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  return c.req.header('x-real-ip') ?? 'unknown'
}

// Exposed for tests/debugging — clears all buckets across the process.
export function _resetBuckets() {
  buckets.clear()
}
