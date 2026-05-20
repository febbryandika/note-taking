import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '../db'
import * as schema from '../db/schema'

const isProd = process.env.NODE_ENV === 'production'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    // Match the docs' minimum so very short passwords are rejected at the
    // auth boundary rather than after a round-trip.
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  trustedOrigins: [process.env.FRONTEND_URL ?? 'http://localhost:5173'],
  advanced: {
    // Force the `Secure` cookie flag in production. In dev (http://localhost)
    // browsers reject Secure cookies, so leave it off there.
    useSecureCookies: isProd,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
    },
  },
  // Built-in rate limit on auth endpoints. Our /api/auth/* middleware also
  // limits by IP — keeping both is cheap and gives us defense in depth.
  rateLimit: {
    enabled: process.env.NODE_ENV !== 'test',
    window: 60,
    max: 20,
  },
})

export type Auth = typeof auth
