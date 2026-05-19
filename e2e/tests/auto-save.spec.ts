import { test, expect } from '../fixtures'

// resetDb is dynamic-imported because spec files run under Node ESM and
// can't resolve the drizzle helpers' extensionless imports statically.
async function resetDb() {
  const { resetDb: reset } = await import('../../backend/tests/helpers/db')
  await reset()
}

test.beforeEach(async () => {
  await resetDb()
})

test('auto-saves after debounce, shows Saved, single PUT for burst', async ({
  page,
  authedPage: _,
}) => {
  await page.goto('/notes')
  await page.getByRole('button', { name: /^new note$/i }).click()

  const titleInput = page.getByPlaceholder(/untitled/i).first()
  await titleInput.click()
  // Clear the default 'Untitled' title so typed keystrokes become the full value.
  await titleInput.press('ControlOrMeta+A')
  await titleInput.press('Delete')

  // Count PUTs to /api/notes/<id> as they fly by.
  let putCount = 0
  page.on('request', (req) => {
    if (req.method() === 'PUT' && /\/api\/notes\/[^/]+(?:\?|$)/.test(req.url())) {
      putCount += 1
    }
  })

  // Type 4 keystrokes within ~600ms — well under the 1s debounce window.
  for (const ch of ['A', 'B', 'C', 'D']) {
    await page.keyboard.type(ch)
    await page.waitForTimeout(150)
  }

  // Wait > 1s past the last keystroke for the debounced PUT to fly.
  await page.waitForTimeout(1500)
  await expect(page.getByText(/^saved$/i)).toBeVisible({ timeout: 3_000 })
  expect(putCount).toBe(1)

  await page.reload()
  // After reload, the editor returns to read mode and renders the title as a heading.
  await expect(page.getByRole('heading', { name: 'ABCD' })).toBeVisible()
})
