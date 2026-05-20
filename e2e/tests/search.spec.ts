import { test, expect } from '../fixtures'

async function resetDb() {
  const { resetDb: reset } = await import('../../backend/tests/helpers/db')
  await reset()
}

test.beforeEach(async () => {
  await resetDb()
})

async function makeNoteViaApi(cookieHeader: string, title: string) {
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
}

test('search filters the note list and clearing restores it', async ({
  page,
  authedUser,
  authedPage: _,
}) => {
  await makeNoteViaApi(authedUser.cookieHeader, 'Alpha apples')
  await makeNoteViaApi(authedUser.cookieHeader, 'Beta bananas')
  await makeNoteViaApi(authedUser.cookieHeader, 'Gamma grapes')

  await page.goto('/notes')
  await expect(page.getByText('Alpha apples')).toBeVisible()
  await expect(page.getByText('Beta bananas')).toBeVisible()
  await expect(page.getByText('Gamma grapes')).toBeVisible()

  const search = page.getByPlaceholder(/search/i).first()
  await search.fill('apple')

  await expect(page.getByText('Alpha apples')).toBeVisible()
  await expect(page.getByText('Beta bananas')).not.toBeVisible()
  await expect(page.getByText('Gamma grapes')).not.toBeVisible()

  await search.fill('')
  await expect(page.getByText('Alpha apples')).toBeVisible()
  await expect(page.getByText('Beta bananas')).toBeVisible()
  await expect(page.getByText('Gamma grapes')).toBeVisible()
})
