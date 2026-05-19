import { beforeEach, describe, expect, test } from 'bun:test'
import { app } from '../../src/index'
import { apiRequest, freshUser } from '../helpers/auth'
import { resetDb } from '../helpers/db'
import { makeNote, makeNotebook } from '../helpers/factory'

beforeEach(async () => {
  await resetDb()
})

describe('notebooks — happy paths', () => {
  test('create, rename, delete', async () => {
    const u = await freshUser()
    const nb = await makeNotebook(u.cookie, 'Work')

    const renameRes = await app.fetch(
      apiRequest('PUT', `/api/notebooks/${nb.id}`, u.cookie, { name: 'Personal' }),
    )
    expect(renameRes.status).toBe(200)
    expect(((await renameRes.json()) as { name: string }).name).toBe('Personal')

    const delRes = await app.fetch(
      apiRequest('DELETE', `/api/notebooks/${nb.id}`, u.cookie),
    )
    expect(delRes.status).toBe(200)
  })
})

describe('notebooks — deletion rules', () => {
  test('delete is blocked when a non-trashed note still references it', async () => {
    const u = await freshUser()
    const nb = await makeNotebook(u.cookie, 'Has Notes')
    await makeNote(u.cookie, { title: 'attached', notebookId: nb.id })

    const res = await app.fetch(
      apiRequest('DELETE', `/api/notebooks/${nb.id}`, u.cookie),
    )
    expect(res.status).toBe(409)
  })

  test('delete is allowed once all remaining notes are trashed', async () => {
    const u = await freshUser()
    const nb = await makeNotebook(u.cookie, 'Drainable')
    const note = await makeNote(u.cookie, { title: 'temp', notebookId: nb.id })
    await app.fetch(apiRequest('DELETE', `/api/notes/${note.id}`, u.cookie))

    const res = await app.fetch(
      apiRequest('DELETE', `/api/notebooks/${nb.id}`, u.cookie),
    )
    expect(res.status).toBe(200)
  })
})

describe('notebooks — ownership', () => {
  test('user B cannot rename or delete user A\'s notebook', async () => {
    const a = await freshUser()
    const b = await freshUser()
    const nb = await makeNotebook(a.cookie, 'A book')

    const renameAsB = await app.fetch(
      apiRequest('PUT', `/api/notebooks/${nb.id}`, b.cookie, { name: 'hijacked' }),
    )
    expect(renameAsB.status).toBe(404)

    const delAsB = await app.fetch(
      apiRequest('DELETE', `/api/notebooks/${nb.id}`, b.cookie),
    )
    expect(delAsB.status).toBe(404)
  })
})
