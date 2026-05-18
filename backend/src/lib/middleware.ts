import type { Context, Next } from 'hono'
import { auth } from './auth'

type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>
export type SessionUser = NonNullable<AuthSession>['user']
export type SessionData = NonNullable<AuthSession>['session']

export type AuthVariables = {
  user: SessionUser
  session: SessionData
}

export async function requireAuth(c: Context, next: Next) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  c.set('user', session.user)
  c.set('session', session.session)
  await next()
}
