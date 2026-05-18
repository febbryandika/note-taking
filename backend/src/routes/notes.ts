import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db'
import { notes } from '../db/schema'
import type { AuthVariables } from '../lib/middleware'

const boolFlag = z.enum(['true', 'false']).optional()

const listQuerySchema = z.object({
  notebookId: z.string().optional(),
  tag: z.string().optional(),
  trashed: boolFlag,
  pinned: boolFlag,
})

const createSchema = z.object({
  title: z.string().max(500).optional(),
  bodyText: z.string().optional(),
  notebookId: z.string().nullable().optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  isPinned: z.boolean().optional(),
})

const updateSchema = createSchema.partial()

const paramSchema = z.object({
  id: z.string().min(1),
})

export const notesRoute = new Hono<{ Variables: AuthVariables }>()
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
        ...(body.bodyText !== undefined ? { bodyText: body.bodyText } : {}),
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
      .where(and(eq(notes.id, id), eq(notes.userId, user.id)))
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
        ...(body.bodyText !== undefined ? { bodyText: body.bodyText } : {}),
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
