import { test, expect } from '../fixtures'

// Dynamic import: Playwright's spec loader can't resolve the helper's
// extensionless ESM imports the same way Node's default loader can.
async function resetDb() {
  const mod = await import('../../backend/tests/helpers/db')
  await mod.resetDb()
}

test.beforeEach(async () => {
  await resetDb()
})

test('create a new note, edit, reload, content persists', async ({ page, authedPage: _ }) => {
  await page.goto('/notes')

  await page.getByRole('button', { name: /^new note$/i }).click()

  const titleInput = page.getByPlaceholder(/untitled/i).first()
  await expect(titleInput).toBeVisible()
  await titleInput.fill('My first note')

  const body = page.locator('[contenteditable="true"]').first()
  await body.click()
  await page.keyboard.type('Hello world')

  await expect(page.getByText(/^saved$/i)).toBeVisible({ timeout: 5_000 })

  await page.reload()
  await expect(page.getByText('My first note')).toBeVisible()
  await expect(page.getByText('Hello world')).toBeVisible()
})
