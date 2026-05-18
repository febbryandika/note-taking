import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db'
import { notebooks, notes } from '../db/schema'
import type { AuthVariables } from '../lib/middleware'

const nameSchema = z.object({
  name: z.string().trim().min(1).max(100),
})

const paramSchema = z.object({
  id: z.string().min(1),
})

export const notebooksRoute = new Hono<{ Variables: AuthVariables }>()
  .get('/', async (c) => {
    const user = c.get('user')
    const rows = await db
      .select()
      .from(notebooks)
      .where(eq(notebooks.userId, user.id))
      .orderBy(asc(notebooks.createdAt))
    return c.json(rows)
  })
  .post('/', zValidator('json', nameSchema), async (c) => {
    const user = c.get('user')
    const { name } = c.req.valid('json')
    const [created] = await db
      .insert(notebooks)
      .values({ userId: user.id, name })
      .returning()
    return c.json(created, 201)
  })
  .put('/:id', zValidator('param', paramSchema), zValidator('json', nameSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')
    const { name } = c.req.valid('json')
    const [updated] = await db
      .update(notebooks)
      .set({ name })
      .where(and(eq(notebooks.id, id), eq(notebooks.userId, user.id)))
      .returning()
    if (!updated) return c.json({ error: 'Not found' }, 404)
    return c.json(updated)
  })
  .delete('/:id', zValidator('param', paramSchema), async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')

    const [blocker] = await db
      .select({ id: notes.id })
      .from(notes)
      .where(and(
        eq(notes.notebookId, id),
        eq(notes.userId, user.id),
        isNull(notes.trashedAt),
      ))
      .limit(1)
    if (blocker) return c.json({ error: 'Notebook has notes' }, 409)

    const [deleted] = await db
      .delete(notebooks)
      .where(and(eq(notebooks.id, id), eq(notebooks.userId, user.id)))
      .returning({ id: notebooks.id })
    if (!deleted) return c.json({ error: 'Not found' }, 404)
    return c.json({ ok: true })
  })
