import { app } from '../../src/index'
import { apiRequest } from './auth'

export async function makeNotebook(
  cookie: string,
  name = 'Test Notebook',
): Promise<{ id: string; name: string; userId: string; createdAt: string }> {
  const res = await app.fetch(apiRequest('POST', '/api/notebooks', cookie, { name }))
  if (res.status !== 201) {
    throw new Error(`makeNotebook failed (${res.status}): ${await res.text()}`)
  }
  return res.json()
}

export type MakeNoteInput = {
  title?: string
  bodyJson?: string
  notebookId?: string | null
  tags?: string[]
  isPinned?: boolean
}

export async function makeNote(
  cookie: string,
  input: MakeNoteInput = {},
): Promise<{
  id: string
  title: string
  bodyJson: string
  bodyText: string
  tags: string[]
  isPinned: boolean
  notebookId: string | null
  trashedAt: string | null
  createdAt: string
  updatedAt: string
}> {
  const res = await app.fetch(apiRequest('POST', '/api/notes', cookie, input))
  if (res.status !== 201) {
    throw new Error(`makeNote failed (${res.status}): ${await res.text()}`)
  }
  return res.json()
}
