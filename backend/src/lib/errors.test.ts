import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { errorResponse } from './errors'

const make = () => {
  const app = new Hono()
  return app
}

describe('errorResponse', () => {
  const cases: Array<[Parameters<typeof errorResponse>[1], number]> = [
    ['BAD_REQUEST', 400],
    ['UNAUTHORIZED', 401],
    ['FORBIDDEN', 403],
    ['NOT_FOUND', 404],
    ['CONFLICT', 409],
    ['PAYLOAD_TOO_LARGE', 413],
    ['RATE_LIMITED', 429],
    ['INTERNAL', 500],
  ]

  for (const [code, status] of cases) {
    test(`${code} → ${status}`, async () => {
      const app = make().get('/x', (c) => errorResponse(c, code, 'oops'))
      const res = await app.request('/x')
      expect(res.status).toBe(status)
      const json = (await res.json()) as { error: { code: string; message: string } }
      expect(json.error.code).toBe(code)
      expect(json.error.message).toBe('oops')
    })
  }

  test('omits details by default', async () => {
    const app = make().get('/x', (c) => errorResponse(c, 'BAD_REQUEST', 'oops'))
    const json = (await (await app.request('/x')).json()) as Record<string, unknown>
    expect(json).toEqual({ error: { code: 'BAD_REQUEST', message: 'oops' } })
  })

  test('includes details when provided', async () => {
    const app = make().get('/x', (c) =>
      errorResponse(c, 'BAD_REQUEST', 'oops', { field: 'email' }),
    )
    const json = (await (await app.request('/x')).json()) as {
      error: { details: { field: string } }
    }
    expect(json.error.details).toEqual({ field: 'email' })
  })
})
