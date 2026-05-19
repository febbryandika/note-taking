import { app } from '../../src/index'

const ORIGIN = 'http://localhost:5177'

export type AuthedClient = {
  user: { id: string; email: string; name: string }
  cookie: string
}

// Convert the response's Set-Cookie header(s) into a single Cookie request
// header value. Better-auth typically sets one cookie, but we handle multi.
function cookieFromResponse(res: Response): string {
  const arr = res.headers.getSetCookie?.() ?? []
  return arr.map((c) => c.split(';')[0]!.trim()).join('; ')
}

async function authRequest(path: string, body: unknown): Promise<Response> {
  const req = new Request(`${ORIGIN}/api/auth${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN },
    body: JSON.stringify(body),
  })
  return app.fetch(req)
}

export async function signUp(
  email: string,
  password: string,
  name = email.split('@')[0]!,
): Promise<AuthedClient> {
  const res = await authRequest('/sign-up/email', { email, password, name })
  if (res.status !== 200) {
    throw new Error(`sign-up failed (${res.status}): ${await res.text()}`)
  }
  const json = (await res.json()) as { user: AuthedClient['user'] }
  return { user: json.user, cookie: cookieFromResponse(res) }
}

export async function signIn(email: string, password: string): Promise<AuthedClient> {
  const res = await authRequest('/sign-in/email', { email, password })
  if (res.status !== 200) {
    throw new Error(`sign-in failed (${res.status}): ${await res.text()}`)
  }
  const json = (await res.json()) as { user: AuthedClient['user'] }
  return { user: json.user, cookie: cookieFromResponse(res) }
}

// Convenience for the test that needs both an auth cookie and a fresh user.
export async function freshUser(): Promise<AuthedClient> {
  const id = crypto.randomUUID().slice(0, 8)
  const email = `user-${id}@test.local`
  return signUp(email, 'password123', `user${id}`)
}

// Build a Hono-compatible request with the session cookie attached.
export function apiRequest(
  method: string,
  path: string,
  cookie: string,
  body?: unknown,
): Request {
  const init: RequestInit = {
    method,
    headers: {
      cookie,
      origin: ORIGIN,
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }
  return new Request(`${ORIGIN}${path}`, init)
}
