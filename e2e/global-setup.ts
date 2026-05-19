// Runs once before any spec. playwright.config.ts already loaded
// TEST_DATABASE_URL from backend/.env into process.env before this point,
// so we just need to run migrations and clear the DB.

async function main() {
  // Importing the backend setup runs migrations against TEST_DATABASE_URL.
  await import('../backend/tests/setup')
  const { resetDb } = await import('../backend/tests/helpers/db')
  await resetDb()
}

export default main
