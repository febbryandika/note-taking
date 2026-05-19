import { beforeEach, describe, expect, test } from 'bun:test'
import { app } from '../../src/index'
import { apiRequest, freshUser } from '../helpers/auth'
import { resetDb } from '../helpers/db'
import { makeNote, makeNotebook } from '../helpers/factory'

beforeEach(async () => {
  await resetDb()
})

describe('notes — CRUD round trip', () => {
  test('create → get → update → soft delete → restore → permanent delete', async () => {
    const u = await freshUser()
    const created = await makeNote(u.cookie, { title: 'first' })
    expect(created.title).toBe('first')

    const got = await app.fetch(apiRequest('GET', `/api/notes/${created.id}`, u.cookie))
    expect(got.status).toBe(200)

    const updateRes = await app.fetch(
      apiRequest('PUT', `/api/notes/${created.id}`, u.cookie, { title: 'second' }),
    )
    expect(updateRes.status).toBe(200)
    expect(((await updateRes.json()) as { title: string }).title).toBe('second')

    const trashRes = await app.fetch(
      apiRequest('DELETE', `/api/notes/${created.id}`, u.cookie),
    )
    expect(trashRes.status).toBe(200)
    expect(((await trashRes.json()) as { trashedAt: string | null }).trashedAt).not.toBeNull()

    const restoreRes = await app.fetch(
      apiRequest('POST', `/api/notes/${created.id}/restore`, u.cookie),
    )
    expect(restoreRes.status).toBe(200)
    expect(((await restoreRes.json()) as { trashedAt: string | null }).trashedAt).toBeNull()

    const earlyHardDelete = await app.fetch(
      apiRequest('DELETE', `/api/notes/${created.id}/permanent`, u.cookie),
    )
    expect(earlyHardDelete.status).toBe(409)

    await app.fetch(apiRequest('DELETE', `/api/notes/${created.id}`, u.cookie))
    const hardDelete = await app.fetch(
      apiRequest('DELETE', `/api/notes/${created.id}/permanent`, u.cookie),
    )
    expect(hardDelete.status).toBe(200)

    const goneRes = await app.fetch(apiRequest('GET', `/api/notes/${created.id}`, u.cookie))
    expect(goneRes.status).toBe(404)
  })
})

describe('notes — list filters and ordering', () => {
  test('filters by notebookId, tag, trashed, pinned', async () => {
    const u = await freshUser()
    const nb = await makeNotebook(u.cookie, 'Work')
    await makeNote(u.cookie, { title: 'Work A', notebookId: nb.id, tags: ['urgent'] })
    await makeNote(u.cookie, { title: 'Work B', notebookId: nb.id, isPinned: true })
    await makeNote(u.cookie, { title: 'Personal' })
    const trashed = await makeNote(u.cookie, { title: 'Old' })
    await app.fetch(apiRequest('DELETE', `/api/notes/${trashed.id}`, u.cookie))

    const byNotebook = (await (
      await app.fetch(
        apiRequest('GET', `/api/notes?notebookId=${nb.id}`, u.cookie),
      )
    ).json()) as Array<{ title: string }>
    expect(byNotebook.map((n) => n.title).sort()).toEqual(['Work A', 'Work B'])

    const byTag = (await (
      await app.fetch(apiRequest('GET', '/api/notes?tag=urgent', u.cookie))
    ).json()) as Array<{ title: string }>
    expect(byTag.map((n) => n.title)).toEqual(['Work A'])

    const onlyPinned = (await (
      await app.fetch(apiRequest('GET', '/api/notes?pinned=true', u.cookie))
    ).json()) as Array<{ title: string }>
    expect(onlyPinned.map((n) => n.title)).toEqual(['Work B'])

    const onlyTrashed = (await (
      await app.fetch(apiRequest('GET', '/api/notes?trashed=true', u.cookie))
    ).json()) as Array<{ title: string }>
    expect(onlyTrashed.map((n) => n.title)).toEqual(['Old'])
  })

  test('default list returns pinned first, then most-recently updated', async () => {
    const u = await freshUser()
    await makeNote(u.cookie, { title: 'old' })
    await new Promise((r) => setTimeout(r, 10))
    const middle = await makeNote(u.cookie, { title: 'middle' })
    await new Promise((r) => setTimeout(r, 10))
    const pinned = await makeNote(u.cookie, { title: 'pinned', isPinned: true })

    await new Promise((r) => setTimeout(r, 10))
    await app.fetch(
      apiRequest('PUT', `/api/notes/${middle.id}`, u.cookie, { title: 'middle!' }),
    )

    const rows = (await (
      await app.fetch(apiRequest('GET', '/api/notes', u.cookie))
    ).json()) as Array<{ id: string; title: string }>
    expect(rows[0]!.id).toBe(pinned.id)
    expect(rows[1]!.title).toBe('middle!')
    expect(rows[2]!.title).toBe('old')
  })
})

describe('notes — ownership', () => {
  test('user B cannot read, update, or delete user A\'s note', async () => {
    const a = await freshUser()
    const b = await freshUser()
    const note = await makeNote(a.cookie, { title: 'A only' })

    const readAsB = await app.fetch(
      apiRequest('GET', `/api/notes/${note.id}`, b.cookie),
    )
    expect(readAsB.status).toBe(404)

    const updateAsB = await app.fetch(
      apiRequest('PUT', `/api/notes/${note.id}`, b.cookie, { title: 'hijack' }),
    )
    expect(updateAsB.status).toBe(404)

    const deleteAsB = await app.fetch(
      apiRequest('DELETE', `/api/notes/${note.id}`, b.cookie),
    )
    expect(deleteAsB.status).toBe(404)

    const readAsA = (await (
      await app.fetch(apiRequest('GET', `/api/notes/${note.id}`, a.cookie))
    ).json()) as { title: string }
    expect(readAsA.title).toBe('A only')
  })
})

describe('notes — search', () => {
  test('FTS returns matching non-trashed notes; ignores empty query', async () => {
    const u = await freshUser()
    await makeNote(u.cookie, {
      title: 'Alpha apples',
      bodyJson: JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'crunchy fruit' }] }],
      }),
    })
    await makeNote(u.cookie, { title: 'Beta bananas' })
    const trashed = await makeNote(u.cookie, { title: 'Apple pie (old)' })
    await app.fetch(apiRequest('DELETE', `/api/notes/${trashed.id}`, u.cookie))

    const hits = (await (
      await app.fetch(
        apiRequest('GET', `/api/notes/search?q=${encodeURIComponent('apple')}`, u.cookie),
      )
    ).json()) as Array<{ title: string }>
    expect(hits.map((n) => n.title)).toEqual(['Alpha apples'])

    const empty = await app.fetch(apiRequest('GET', '/api/notes/search?q=', u.cookie))
    expect(empty.status).toBe(400)
  })
})
