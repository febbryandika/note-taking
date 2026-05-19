import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../../src/db/schema'
import { _resetBuckets } from '../../src/lib/rateLimit'

const sql = neon(process.env.DATABASE_URL!)
export const testDb = drizzle(sql, { schema })

// CASCADE so dependent rows (sessions, accounts, notebooks, notes) go with
// their owning user. Order doesn't matter under CASCADE, but listing leaf
// tables first makes the intent obvious.
const TABLES = ['notes', 'notebooks', 'session', 'account', 'verification', 'user']

export async function resetDb() {
  await sql(`TRUNCATE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`)
  _resetBuckets()
}
