import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db'
import { notes } from '../db/schema'
import type { AuthVariables } from '../lib/middleware'
import { MAX_BODY_JSON_INPUT_BYTES, sanitizeTipTapJson } from '../lib/sanitize'

const boolFlag = z.enum(['true', 'false']).optional()

const listQuerySchema = z.object({
  notebookId: z.string().min(1).max(64).optional(),
  tag: z.string().trim().min(1).max(32).optional(),
  trashed: boolFlag,
  pinned: boolFlag,
})

// Each tag: trimmed, lower-cased, capped at 32 chars. The full set is capped
// at 20 entries and deduped server-side so a client can't poison the tag cloud
// with thousands of near-duplicates.
const tagSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .transform((s) => s.toLowerCase())

const tagsSchema = z
  .array(tagSchema)
  .max(20)
  .transform((arr) => Array.from(new Set(arr)))

// Parse + sanitize TipTap JSON inline. The transform yields both the
// re-serialized JSON and the derived plaintext, so route handlers can drop
// the client-supplied bodyText entirely.
const bodyJsonSchema = z
  .string()
  .max(MAX_BODY_JSON_INPUT_BYTES, 'bodyJson too large')
  .transform((s, ctx) => {
    let parsed: unknown
    try {
      parsed = JSON.parse(s)
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'bodyJson is not valid JSON' })
      return z.NEVER
    }
    try {
      return sanitizeTipTapJson(parsed)
    } catch (e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: e instanceof Error ? e.message : 'Invalid bodyJson',
      })
      return z.NEVER
    }
  })

const createSchema = z.object({
  title: z.string().trim().max(200).optional(),
  bodyJson: bodyJsonSchema.optional(),
  notebookId: z.string().min(1).max(64).nullable().optional(),
  tags: tagsSchema.optional(),
  isPinned: z.boolean().optional(),
})

const updateSchema = createSchema.partial()

const paramSchema = z.object({
  id: z.string().min(1).max(64),
})

const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
})

export const notesRoute = new Hono<{ Variables: AuthVariables }>()
  .get('/search', zValidator('query', searchQuerySchema), async (c) => {
    const user = c.get('user')
    const { q } = c.req.valid('query')

    // websearch_to_tsquery tolerates raw user input (quotes, AND/OR, dashes)
    // without throwing — to_tsquery would error on most natural-language input.
    const tsq = sql`websearch_to_tsquery('english', ${q})`
    const rows = await db
      .select()
      .from(notes)
      .where(sql`
        ${notes.userId} = ${user.id}
        AND ${notes.trashedAt} IS NULL
        AND ${notes}.fts @@ ${tsq}
      `)
      .orderBy(sql`ts_rank(${notes}.fts, ${tsq}) DESC`, desc(notes.updatedAt))
      .limit(50)
    return c.json(rows)
  })
  .get('/', zValidator('query', listQuerySchema), async (c) => {
    const user = c.get('user')
    const q = c.req.valid('query')

    const conditions = [eq(notes.userId, user.id)]
    conditions.push(q.trashed === 'true' ? isNotNull(notes.trashedAt) : isNull(notes.trashedAt))
    if (q.notebookId) conditions.push(eq(notes.notebookId, q.notebookId))
    if (q.pinned === 'true') conditions.push(eq(notes.isPinned, true))
    if (q.tag) conditions.push(sql`${q.tag} = ANY(${notes.tags})`)

    const rows = await db
      .select()
      .from(notes)
      .where(and(...conditions))
      .orderBy(desc(notes.isPinned), desc(notes.updatedAt))
    return c.json(rows)
  })
  .post('/', zValidator('json', createSchema), async (c) => {
    const user = c.get('user')
    const body = c.req.valid('json')
    const [created] = await db
      .insert(notes)
      .values({
        userId: user.id,
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.bodyJson !== undefined
          ? { bodyJson: body.bodyJson.json, bodyText: body.bodyJson.text }
          : {}),
        ...(body.notebookId !== undefined ? { notebookId: body.notebookId } : {}),
        ...(body.tags !== undefined ? { tags: body.tags } : {}),
        ...(body.isPinned !== undefined ? { isPinned: body.isPinned } : {}),
      })
      .returning()
    return c.json(created, 201)
  })
  .get('/:id', zValidator('param', paramSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')
    const [row] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, user.id), isNull(notes.trashedAt)))
      .limit(1)
    if (!row) return c.json({ error: 'Not found' }, 404)
    return c.json(row)
  })
  .put('/:id', zValidator('param', paramSchema), zValidator('json', updateSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const [updated] = await db
      .update(notes)
      .set({
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.bodyJson !== undefined
          ? { bodyJson: body.bodyJson.json, bodyText: body.bodyJson.text }
          : {}),
        ...(body.notebookId !== undefined ? { notebookId: body.notebookId } : {}),
        ...(body.tags !== undefined ? { tags: body.tags } : {}),
        ...(body.isPinned !== undefined ? { isPinned: body.isPinned } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(notes.id, id), eq(notes.userId, user.id)))
      .returning()
    if (!updated) return c.json({ error: 'Not found' }, 404)
    return c.json(updated)
  })
  .delete('/:id', zValidator('param', paramSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')
    const [updated] = await db
      .update(notes)
      .set({ trashedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(notes.id, id), eq(notes.userId, user.id)))
      .returning()
    if (!updated) return c.json({ error: 'Not found' }, 404)
    return c.json(updated)
  })
  .post('/:id/restore', zValidator('param', paramSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')
    const [updated] = await db
      .update(notes)
      .set({ trashedAt: null, updatedAt: new Date() })
      .where(and(eq(notes.id, id), eq(notes.userId, user.id)))
      .returning()
    if (!updated) return c.json({ error: 'Not found' }, 404)
    return c.json(updated)
  })
  .delete('/:id/permanent', zValidator('param', paramSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')
    const [deleted] = await db
      .delete(notes)
      .where(and(
        eq(notes.id, id),
        eq(notes.userId, user.id),
        isNotNull(notes.trashedAt),
      ))
      .returning({ id: notes.id })
    if (!deleted) return c.json({ error: 'Not found or not trashed' }, 409)
    return c.json({ ok: true })
  })
