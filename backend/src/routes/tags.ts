import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { db } from '../db'
import { notes } from '../db/schema'
import type { AuthVariables } from '../lib/middleware'

export const tagsRoute = new Hono<{ Variables: AuthVariables }>()
  .get('/', async (c) => {
    const user = c.get('user')
    const result = await db.execute<{ tag: string; count: number }>(sql`
      SELECT tag, COUNT(*)::int AS count
      FROM ${notes}, UNNEST(${notes.tags}) AS tag
      WHERE ${notes.userId} = ${user.id}
        AND ${notes.trashedAt} IS NULL
      GROUP BY tag
      ORDER BY count DESC, tag ASC
    `)
    return c.json(result.rows)
  })
