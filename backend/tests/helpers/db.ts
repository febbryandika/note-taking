import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { getTableName, type Table } from 'drizzle-orm'
import * as schema from '../../src/db/schema'
import { _resetBuckets } from '../../src/lib/rateLimit'

// We instantiate our own Neon client (separate from `src/db`) so test
// noise stays out of the slow-query logger that wraps the production client.
const sql = neon(process.env.DATABASE_URL!)
export const testDb = drizzle(sql, { schema })

// Derive the table list from the schema so new app tables are auto-included.
// CASCADE handles dependent rows (sessions, accounts, notebooks, notes).
function tableNames(): string[] {
  return Object.values(schema)
    .filter((v): v is Table => typeof v === 'object' && v !== null && Symbol.for('drizzle:Name') in (v as object))
    .map((t) => getTableName(t))
}

export async function resetDb() {
  const names = tableNames()
  if (names.length === 0) return
  const quoted = names.map((t) => `"${t}"`).join(', ')
  await sql(`TRUNCATE ${quoted} RESTART IDENTITY CASCADE`)
  _resetBuckets()
}
