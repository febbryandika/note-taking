import { ValidationError } from './errors'

// Whitelist what the TipTap editor can actually produce (see frontend
// TipTapEditor StarterKit config). Anything else is dropped silently —
// orderedList is kept in case it's re-enabled later.
const ALLOWED_NODES = new Set([
  'doc',
  'paragraph',
  'heading',
  'text',
  'hardBreak',
  'bulletList',
  'orderedList',
  'listItem',
])
const ALLOWED_MARKS = new Set(['bold', 'italic'])
const BLOCK_BOUNDARY_NODES = new Set(['paragraph', 'heading', 'listItem'])

const MAX_DEPTH = 20
const MAX_NODES = 5_000
export const MAX_BODY_JSON_INPUT_BYTES = 256 * 1024
const MAX_BODY_TEXT_CHARS = 64 * 1024

type ProseNode = {
  type: string
  attrs?: Record<string, unknown>
  content?: ProseNode[]
  marks?: { type: string }[]
  text?: string
}

// Sanitize and re-serialize a TipTap doc. Never trust the client's bodyText —
// we re-derive it here so the FTS index can't be poisoned by mismatched fields.
export function sanitizeTipTapJson(input: unknown): { json: string; text: string } {
  // Frontend default is the literal string '{}' for a brand-new note that
  // was never edited. Treat that as an empty doc instead of rejecting it.
  if (isPlainObject(input) && Object.keys(input).length === 0) {
    return { json: '{}', text: '' }
  }
  if (!isPlainObject(input) || input.type !== 'doc') {
    throw new ValidationError('bodyJson must be a TipTap doc node')
  }

  let nodeCount = 0
  const textParts: string[] = []
  let segment = ''

  const flush = () => {
    if (segment.length > 0) textParts.push(segment)
    segment = ''
  }

  const walk = (node: unknown, depth: number): ProseNode | null => {
    if (depth > MAX_DEPTH) {
      throw new ValidationError('bodyJson nesting too deep')
    }
    if (++nodeCount > MAX_NODES) {
      throw new ValidationError('bodyJson exceeds max node count')
    }
    if (!isPlainObject(node)) return null
    const { type } = node
    if (typeof type !== 'string' || !ALLOWED_NODES.has(type)) return null

    const out: ProseNode = { type }

    if (
      type === 'heading' &&
      isPlainObject(node.attrs) &&
      typeof node.attrs.level === 'number'
    ) {
      const lvl = Math.min(6, Math.max(1, Math.trunc(node.attrs.level)))
      out.attrs = { level: lvl }
    }

    if (type === 'text') {
      if (typeof node.text !== 'string') return null
      const clean = stripControlChars(node.text)
      if (clean.length === 0) return null
      out.text = clean
      segment += clean

      if (Array.isArray(node.marks)) {
        const marks: { type: string }[] = []
        for (const m of node.marks) {
          if (
            isPlainObject(m) &&
            typeof m.type === 'string' &&
            ALLOWED_MARKS.has(m.type)
          ) {
            marks.push({ type: m.type })
          }
        }
        if (marks.length) out.marks = marks
      }
      return out
    }

    if (type === 'hardBreak') {
      segment += '\n'
      return out
    }

    if (Array.isArray(node.content)) {
      const children: ProseNode[] = []
      for (const c of node.content) {
        const w = walk(c, depth + 1)
        if (w) children.push(w)
      }
      if (children.length) out.content = children
    }

    if (BLOCK_BOUNDARY_NODES.has(type)) flush()
    return out
  }

  const root = walk(input, 0)
  flush()
  if (!root) {
    throw new ValidationError('bodyJson is empty after sanitization')
  }

  const text = textParts.join('\n').slice(0, MAX_BODY_TEXT_CHARS)
  const json = JSON.stringify(root)
  if (json.length > MAX_BODY_JSON_INPUT_BYTES) {
    throw new ValidationError('bodyJson exceeds max size')
  }
  return { json, text }
}

// Keep \t \n \r, drop other C0 controls and DEL.
function stripControlChars(s: string): string {
  return s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
