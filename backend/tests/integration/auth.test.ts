import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { session as sessionTable } from '../../src/db/schema'
import { app } from '../../src/index'
import { apiRequest, freshUser, signIn, signUp } from '../helpers/auth'
import { resetDb, testDb } from '../helpers/db'

const ORIGIN = 'http://localhost:5177'

beforeEach(async () => {
  await resetDb()
})

describe('auth', () => {
  test('sign-up returns 200 and a session cookie', async () => {
    const user = await signUp('a@test.local', 'password123', 'Alice')
    expect(user.user.email).toBe('a@test.local')
    expect(user.cookie).toMatch(/=/)
  })

  test('sign-up with short password is rejected', async () => {
    const req = new Request(`${ORIGIN}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: ORIGIN },
      body: JSON.stringify({ email: 'b@test.local', password: 'short', name: 'B' }),
    })
    const res = await app.fetch(req)
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  test('sign-in with correct creds returns cookie; wrong creds → error', async () => {
    await signUp('c@test.local', 'password123', 'C')
    const ok = await signIn('c@test.local', 'password123')
    expect(ok.cookie).toMatch(/=/)

    const badReq = new Request(`${ORIGIN}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: ORIGIN },
      body: JSON.stringify({ email: 'c@test.local', password: 'WRONG-pw-9' }),
    })
    const res = await app.fetch(badReq)
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  test('GET /api/me without cookie → 401', async () => {
    const res = await app.fetch(apiRequest('GET', '/api/me', ''))
    expect(res.status).toBe(401)
  })

  test('GET /api/me with cookie returns the user', async () => {
    const u = await freshUser()
    const res = await app.fetch(apiRequest('GET', '/api/me', u.cookie))
    expect(res.status).toBe(200)
    const json = (await res.json()) as { user: { id: string } }
    expect(json.user.id).toBe(u.user.id)
  })

  test('expired session is rejected', async () => {
    const u = await freshUser()
    await testDb
      .update(sessionTable)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(sessionTable.userId, u.user.id))

    const res = await app.fetch(apiRequest('GET', '/api/me', u.cookie))
    expect(res.status).toBe(401)
  })

  test('sign-out invalidates the session', async () => {
    const u = await freshUser()
    const out = await app.fetch(apiRequest('POST', '/api/auth/sign-out', u.cookie))
    expect(out.status).toBe(200)

    const me = await app.fetch(apiRequest('GET', '/api/me', u.cookie))
    expect(me.status).toBe(401)
  })
})
