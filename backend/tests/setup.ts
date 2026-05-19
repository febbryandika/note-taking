// Runs once at the start of every `bun test` invocation in backend/.
// Must execute BEFORE any module that reads DATABASE_URL is imported.

import { neon } from '@neondatabase/serverless'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const testUrl = process.env.TEST_DATABASE_URL
if (!testUrl) {
  throw new Error('TEST_DATABASE_URL is required to run tests')
}
if (testUrl === process.env.DATABASE_URL) {
  throw new Error(
    'TEST_DATABASE_URL must differ from DATABASE_URL — refusing to run against production data',
  )
}

// Swap the env so every module that lazily reads DATABASE_URL gets the test branch.
process.env.DATABASE_URL = testUrl
process.env.NODE_ENV = 'test'

const sql = neon(testUrl)
const migrationsDir = path.resolve(import.meta.dir, '../drizzle')

const files = (await readdir(migrationsDir))
  .filter((f) => f.endsWith('.sql'))
  .sort()

for (const file of files) {
  const raw = await readFile(path.join(migrationsDir, file), 'utf8')
  // drizzle-kit emits statements separated by `--> statement-breakpoint`.
  const statements = raw
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean)
  for (const stmt of statements) {
    try {
      await sql(stmt)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      // Re-running migrations on an already-prepared DB is fine — swallow
      // "already exists" so the suite is idempotent across local runs.
      if (!/already exists|duplicate/i.test(msg)) throw e
    }
  }
}
