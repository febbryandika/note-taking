import { afterEach, beforeEach, describe, expect, setSystemTime, test } from 'bun:test'
import { Hono } from 'hono'
import { _resetBuckets, methodLimit, rateLimit } from './rateLimit'

function makeApp(opts: Parameters<typeof rateLimit>[0]) {
  return new Hono()
    .use('*', rateLimit(opts))
    .get('/', (c) => c.text('ok'))
    .post('/', (c) => c.text('ok'))
}

const ipHeaders = { 'x-forwarded-for': '10.0.0.1' }

beforeEach(() => {
  _resetBuckets()
  setSystemTime(new Date('2026-01-01T00:00:00Z'))
})
afterEach(() => {
  setSystemTime() // restore real time
})

describe('rateLimit', () => {
  test('allows up to `limit` requests then returns 429', async () => {
    const app = makeApp({ name: 't1', limit: 3, windowMs: 60_000, keyBy: 'ip' })
    for (let i = 0; i < 3; i++) {
      const res = await app.request('/', { headers: ipHeaders })
      expect(res.status).toBe(200)
    }
    const res = await app.request('/', { headers: ipHeaders })
    expect(res.status).toBe(429)
    const json = (await res.json()) as { error: { code: string } }
    expect(json.error.code).toBe('RATE_LIMITED')
  })

  test('sets X-RateLimit-* and Retry-After headers', async () => {
    const app = makeApp({ name: 't2', limit: 2, windowMs: 60_000, keyBy: 'ip' })
    const ok = await app.request('/', { headers: ipHeaders })
    expect(ok.headers.get('X-RateLimit-Limit')).toBe('2')
    expect(ok.headers.get('X-RateLimit-Remaining')).toBe('1')
    expect(ok.headers.get('X-RateLimit-Reset')).toMatch(/^\d+$/)

    await app.request('/', { headers: ipHeaders })
    const blocked = await app.request('/', { headers: ipHeaders })
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('Retry-After')).toMatch(/^\d+$/)
  })

  test('resets after windowMs elapses', async () => {
    const app = makeApp({ name: 't3', limit: 1, windowMs: 60_000, keyBy: 'ip' })
    expect((await app.request('/', { headers: ipHeaders })).status).toBe(200)
    expect((await app.request('/', { headers: ipHeaders })).status).toBe(429)

    setSystemTime(new Date('2026-01-01T00:02:00Z')) // +2 minutes
    expect((await app.request('/', { headers: ipHeaders })).status).toBe(200)
  })

  test('different bucket names share no counters', async () => {
    const a = makeApp({ name: 'A', limit: 1, windowMs: 60_000, keyBy: 'ip' })
    const b = makeApp({ name: 'B', limit: 1, windowMs: 60_000, keyBy: 'ip' })
    expect((await a.request('/', { headers: ipHeaders })).status).toBe(200)
    expect((await b.request('/', { headers: ipHeaders })).status).toBe(200)
  })
})

describe('methodLimit', () => {
  test('applies inner middleware only to listed methods', async () => {
    const inner = rateLimit({ name: 'm', limit: 1, windowMs: 60_000, keyBy: 'ip' })
    const app = new Hono()
      .use('*', methodLimit(['POST'], inner))
      .get('/', (c) => c.text('ok'))
      .post('/', (c) => c.text('ok'))

    for (let i = 0; i < 5; i++) {
      expect((await app.request('/', { headers: ipHeaders })).status).toBe(200)
    }

    expect(
      (await app.request('/', { method: 'POST', headers: ipHeaders })).status,
    ).toBe(200)
    expect(
      (await app.request('/', { method: 'POST', headers: ipHeaders })).status,
    ).toBe(429)
  })
})
