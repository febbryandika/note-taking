import type { Context, Next } from 'hono'
import { auth } from './auth'
import { errorResponse } from './errors'
import { requestContext } from './logger'

type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>
export type SessionUser = NonNullable<AuthSession>['user']
export type SessionData = NonNullable<AuthSession>['session']

export type AuthVariables = {
  user: SessionUser
  session: SessionData
}

export async function requireAuth(c: Context, next: Next) {
  let session: AuthSession
  try {
    session = await auth.api.getSession({ headers: c.req.raw.headers })
  } catch {
    // Fail closed on any internal error — never leak the reason.
    return errorResponse(c, 'UNAUTHORIZED', 'Unauthorized')
  }
  if (!session) return errorResponse(c, 'UNAUTHORIZED', 'Unauthorized')

  // Defense in depth: better-auth already filters expired sessions, but
  // a stale row could still be returned in theory. Reject just in case.
  const exp = session.session.expiresAt
  if (exp instanceof Date && exp.getTime() <= Date.now()) {
    return errorResponse(c, 'UNAUTHORIZED', 'Session expired')
  }
  if (!session.user?.id) return errorResponse(c, 'UNAUTHORIZED', 'Unauthorized')

  // Mutate the in-flight request context so downstream query logs inherit
  // the userId. Safe: the store object is exclusive to this request.
  const ctx = requestContext.getStore()
  if (ctx) ctx.userId = session.user.id

  c.set('user', session.user)
  c.set('session', session.session)
  await next()
}
