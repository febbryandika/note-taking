import { test, expect } from '@playwright/test'

// Dynamic import: Playwright's spec loader can't resolve the helper's
// extensionless ESM imports the same way Node's default loader can.
async function resetDb() {
  const mod = await import('../../backend/tests/helpers/db')
  await mod.resetDb()
}

test.beforeEach(async () => {
  await resetDb()
})

test('register, sign out, sign back in', async ({ page }) => {
  const email = `login-${Date.now()}@test.local`

  await page.goto('/register')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill('password123')
  await page.getByLabel(/name/i).fill('Login Test')
  await page.getByRole('button', { name: /sign up|register|create/i }).click()
  await page.waitForURL(/\/notes/)

  await page.getByRole('button', { name: /sign ?out|log ?out/i }).click()
  // App redirects to "/" after sign-out (not /login); navigate manually.
  await page.waitForURL(/\/$/)
  await page.goto('/login')

  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill('password123')
  await page.getByRole('button', { name: /sign in|log in/i }).click()
  await page.waitForURL(/\/notes/)
})

test('wrong password keeps user on /login and shows an error', async ({ page }) => {
  const email = `bad-${Date.now()}@test.local`
  await fetch('http://localhost:3000/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:5177' },
    body: JSON.stringify({ email, password: 'password123', name: 'Bad' }),
  })

  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill('WRONG-pw-9')
  await page.getByRole('button', { name: /sign in|log in/i }).click()

  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByText(/invalid|incorrect|wrong|failed/i)).toBeVisible({ timeout: 5_000 })
})
