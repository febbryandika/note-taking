import { describe, expect, test } from 'bun:test'
import { bodyJsonSchema, listQuerySchema, tagsSchema } from './notes'

describe('tagsSchema', () => {
  test('trims, lowercases, dedupes', () => {
    const out = tagsSchema.parse(['  Hello ', 'WORLD', 'hello', 'world '])
    expect(out).toEqual(['hello', 'world'])
  })

  test('rejects empty tag', () => {
    expect(() => tagsSchema.parse([''])).toThrow()
    expect(() => tagsSchema.parse(['   '])).toThrow()
  })

  test('rejects tag longer than 32 chars', () => {
    expect(() => tagsSchema.parse(['a'.repeat(33)])).toThrow()
  })

  test('caps total tags at 20', () => {
    const tags = Array.from({ length: 21 }, (_, i) => `t${i}`)
    expect(() => tagsSchema.parse(tags)).toThrow()
  })
})

describe('listQuerySchema', () => {
  test('accepts known string booleans', () => {
    expect(listQuerySchema.parse({ trashed: 'true' })).toMatchObject({ trashed: 'true' })
    expect(listQuerySchema.parse({ pinned: 'false' })).toMatchObject({ pinned: 'false' })
  })

  test('rejects other truthy strings', () => {
    expect(() => listQuerySchema.parse({ trashed: 'yes' })).toThrow()
    expect(() => listQuerySchema.parse({ pinned: '1' })).toThrow()
  })

  test('all fields optional', () => {
    expect(listQuerySchema.parse({})).toEqual({})
  })
})

describe('bodyJsonSchema', () => {
  test('parses a valid doc and returns json + text', () => {
    const input = JSON.stringify({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'hello' }] },
      ],
    })
    const out = bodyJsonSchema.parse(input)
    expect(out.text).toBe('hello')
    expect(JSON.parse(out.json).type).toBe('doc')
  })

  test('rejects invalid JSON', () => {
    expect(() => bodyJsonSchema.parse('not json{')).toThrow(/valid JSON/i)
  })

  test('rejects oversize input', () => {
    const huge = 'x'.repeat(300 * 1024)
    expect(() => bodyJsonSchema.parse(huge)).toThrow(/too large/i)
  })

  test('propagates sanitize errors (non-doc root)', () => {
    expect(() => bodyJsonSchema.parse(JSON.stringify({ type: 'paragraph' }))).toThrow()
  })
})
