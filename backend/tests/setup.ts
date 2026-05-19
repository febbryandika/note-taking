// Runs once at the start of every `bun test` invocation in backend/.
// Must execute BEFORE any module that reads DATABASE_URL is imported.

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'
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

// Swap the env so every module that lazily reads DATABASE_URL gets the test
// branch. NODE_ENV='test' also gates better-auth's built-in rate limit.
process.env.DATABASE_URL = testUrl
process.env.NODE_ENV = 'test'

const migrationsFolder = path.resolve(import.meta.dir, '../drizzle')
const migrationDb = drizzle(neon(testUrl))

try {
  await migrate(migrationDb, { migrationsFolder })
} catch (e) {
  console.error('[test setup] migration failed:', e)
  throw e
}
