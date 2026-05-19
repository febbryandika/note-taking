import { test as base, expect } from '@playwright/test'

export type Authed = {
  email: string
  password: string
  name: string
  cookieHeader: string
}

// `authedUser` signs up a brand-new account via the API and returns the
// session cookie. Specs that need a pre-logged-in browser context use the
// `authedPage` fixture, which seeds the cookie onto the browser before
// any UI action.
export const test = base.extend<{ authedUser: Authed; authedPage: typeof base.expect }>({
  // eslint-disable-next-line no-empty-pattern
  authedUser: async ({}, use, testInfo) => {
    const stamp = `${Date.now()}-${testInfo.workerIndex}-${testInfo.title.replace(/\W+/g, '')}`
    const email = `e2e-${stamp}@test.local`
    const password = 'password123'
    const name = `E2E ${stamp}`

    const res = await fetch('http://localhost:3000/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:5177' },
      body: JSON.stringify({ email, password, name }),
    })
    if (!res.ok) throw new Error(`sign-up failed: ${res.status} ${await res.text()}`)
    const cookies = res.headers.getSetCookie?.() ?? []
    const cookieHeader = cookies.map((c) => c.split(';')[0]!).join('; ')

    await use({ email, password, name, cookieHeader })
  },

  authedPage: async ({ page, authedUser }, use) => {
    const cookies = authedUser.cookieHeader.split(';').map((pair) => {
      const [name, ...rest] = pair.trim().split('=')
      return {
        name: name!,
        value: rest.join('='),
        domain: 'localhost',
        path: '/',
      }
    })
    await page.context().addCookies(cookies)
    await use(expect)
  },
})

export { expect }
