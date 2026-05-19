import { describe, expect, test } from 'bun:test'
import { sanitizeTipTapJson } from './sanitize'
import { ValidationError } from './errors'

describe('sanitizeTipTapJson', () => {
  test('treats empty {} as an empty doc', () => {
    expect(sanitizeTipTapJson({})).toEqual({ json: '{}', text: '' })
  })

  test('rejects non-doc root', () => {
    expect(() => sanitizeTipTapJson({ type: 'paragraph' })).toThrow(ValidationError)
    expect(() => sanitizeTipTapJson('hello')).toThrow(ValidationError)
    expect(() => sanitizeTipTapJson(null)).toThrow(ValidationError)
  })

  test('extracts plaintext joining block boundaries with newline', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'hello' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'world' }] },
      ],
    }
    const out = sanitizeTipTapJson(doc)
    expect(out.text).toBe('hello\nworld')
  })

  test('hardBreak inserts inline newline within a block', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'line1' },
            { type: 'hardBreak' },
            { type: 'text', text: 'line2' },
          ],
        },
      ],
    }
    expect(sanitizeTipTapJson(doc).text).toBe('line1\nline2')
  })

  test('strips disallowed node types', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'kept' }] },
        { type: 'codeBlock', content: [{ type: 'text', text: 'dropped' }] },
      ],
    }
    const out = sanitizeTipTapJson(doc)
    expect(out.text).toBe('kept')
    expect(out.json).not.toContain('codeBlock')
  })

  test('strips disallowed marks but keeps text', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'phish',
              marks: [{ type: 'link', attrs: { href: 'http://x' } }],
            },
          ],
        },
      ],
    }
    const out = sanitizeTipTapJson(doc)
    expect(out.text).toBe('phish')
    expect(out.json).not.toContain('link')
  })

  test('keeps allowed marks', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'bold', marks: [{ type: 'bold' }] }],
        },
      ],
    }
    const json = JSON.parse(sanitizeTipTapJson(doc).json)
    expect(json.content[0].content[0].marks).toEqual([{ type: 'bold' }])
  })

  test('enforces max depth', () => {
    let cur: any = { type: 'text', text: 'x' }
    for (let i = 0; i < 30; i++) {
      cur = { type: 'bulletList', content: [{ type: 'listItem', content: [cur] }] }
    }
    const doc = { type: 'doc', content: [cur] }
    expect(() => sanitizeTipTapJson(doc)).toThrow(/nesting too deep/i)
  })

  test('enforces max node count', () => {
    const paragraphs = Array.from({ length: 6000 }, () => ({
      type: 'paragraph',
      content: [{ type: 'text', text: 'x' }],
    }))
    const doc = { type: 'doc', content: paragraphs }
    expect(() => sanitizeTipTapJson(doc)).toThrow(/max node count/i)
  })

  test('strips C0 control chars but preserves tab/newline/carriage-return', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'a\x01b\tc\rd' }],
        },
      ],
    }
    const out = sanitizeTipTapJson(doc)
    expect(out.text).toBe('ab\tc\rd')
  })

  test('clamps heading level to 1..6', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 99 }, content: [{ type: 'text', text: 'h' }] },
      ],
    }
    const json = JSON.parse(sanitizeTipTapJson(doc).json)
    expect(json.content[0].attrs.level).toBe(6)
  })
})
