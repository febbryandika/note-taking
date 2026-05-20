import { test, expect } from '../fixtures'

async function resetDb() {
  const { resetDb: reset } = await import('../../backend/tests/helpers/db')
  await reset()
}

test.beforeEach(async () => {
  await resetDb()
})

async function makeNoteViaApi(cookieHeader: string, title: string): Promise<string> {
  const res = await fetch('http://localhost:3000/api/notes', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: cookieHeader,
      origin: 'http://localhost:5173',
    },
    body: JSON.stringify({ title }),
  })
  if (!res.ok) throw new Error(`makeNote failed: ${res.status}`)
  const json = (await res.json()) as { id: string }
  return json.id
}

test('trash, restore, then permanent delete', async ({ page, authedUser, authedPage: _ }) => {
  const title = `Throwaway ${Date.now()}`
  await makeNoteViaApi(authedUser.cookieHeader, title)

  await page.goto('/notes')
  await expect(page.getByText(title)).toBeVisible()

  // Open the note and trash it.
  await page.getByText(title).click()
  await page.getByRole('button', { name: /move to trash/i }).click()

  // Gone from /notes, present in /trash.
  await page.goto('/notes')
  await expect(page.getByText(title)).not.toBeVisible()

  await page.goto('/trash')
  await expect(page.getByText(title)).toBeVisible()

  // Restore via the per-row Restore button.
  await page.getByRole('button', { name: 'Restore' }).first().click()
  await page.goto('/notes')
  await expect(page.getByText(title)).toBeVisible()

  // Trash again, then permanent delete from /trash via the ConfirmModal.
  await page.getByText(title).click()
  await page.getByRole('button', { name: /move to trash/i }).click()
  await page.goto('/trash')
  await expect(page.getByText(title)).toBeVisible()

  // Row button has aria-label="Delete permanently"; click it to open the modal.
  await page.getByRole('button', { name: 'Delete permanently' }).first().click()

  // Modal opens (<dialog> with title "Delete permanently?"). The confirm
  // button inside the dialog has visible text "Delete permanently" — scope
  // to the dialog to avoid matching the row button again.
  await expect(page.getByText('Delete permanently?')).toBeVisible()
  await page.locator('dialog').getByText('Delete permanently', { exact: true }).click()

  await page.reload()
  await expect(page.getByText(title)).not.toBeVisible()
})
