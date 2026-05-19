import type { MiddlewareHandler } from 'hono'

export function securityHeaders(): MiddlewareHandler {
  return async (c, next) => {
    await next()
    const h = c.res.headers
    h.set('X-Content-Type-Options', 'nosniff')
    h.set('X-Frame-Options', 'DENY')
    h.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    h.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
    h.set('Cross-Origin-Resource-Policy', 'same-site')
    h.delete('Server')
    h.delete('X-Powered-By')
  }
}
