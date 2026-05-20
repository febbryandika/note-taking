import { defineConfig, devices } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

// Load backend/.env so TEST_DATABASE_URL is available before `webServer.env`
// is evaluated. (globalSetup runs too late for this — the webServer config
// is read synchronously when playwright.config.ts is loaded.)
const envPath = path.resolve(__dirname, 'backend/.env')
try {
  const raw = readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2]!
  }
} catch {
  // .env is optional — env may be set via the shell.
}

if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    'TEST_DATABASE_URL is required for E2E. Set it in backend/.env or your shell.',
  )
}

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'

export default defineConfig({
  testDir: 'e2e/tests',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 30_000,
  use: {
    baseURL: FRONTEND_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'cd backend && bun run dev',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        DATABASE_URL: process.env.TEST_DATABASE_URL!,
        NODE_ENV: 'test',
      },
    },
    {
      command: 'cd frontend && bun run dev -- --port 5173 --strictPort',
      url: FRONTEND_URL,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        NODE_ENV: 'test',
      },
    },
  ],
})
