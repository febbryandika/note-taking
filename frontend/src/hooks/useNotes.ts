import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/client'

export type NoteFilters = {
  notebookId?: string
  tag?: string
  trashed?: boolean
  pinned?: boolean
}

export const notesKey = ['notes'] as const

function queryFromFilters(f: NoteFilters) {
  const q: Record<string, string> = {}
  if (f.notebookId) q.notebookId = f.notebookId
  if (f.tag) q.tag = f.tag
  if (f.trashed !== undefined) q.trashed = f.trashed ? 'true' : 'false'
  if (f.pinned !== undefined) q.pinned = f.pinned ? 'true' : 'false'
  return q
}

export function useNotes(filters: NoteFilters = {}) {
  return useQuery({
    queryKey: [...notesKey, filters],
    queryFn: async () => {
      const res = await client.api.notes.$get({ query: queryFromFilters(filters) })
      if (!res.ok) throw new Error('Failed to load notes')
      return res.json()
    },
  })
}

export function useNote(id: string) {
  return useQuery({
    queryKey: [...notesKey, 'detail', id],
    queryFn: async () => {
      const res = await client.api.notes[':id'].$get({ param: { id } })
      if (!res.ok) throw new Error('Failed to load note')
      return res.json()
    },
    enabled: Boolean(id),
  })
}

type CreateInput = {
  title?: string
  bodyText?: string
  notebookId?: string | null
  tags?: string[]
  isPinned?: boolean
}

export function useCreateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateInput = {}) => {
      const res = await client.api.notes.$post({ json: input })
      if (!res.ok) throw new Error('Failed to create note')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: notesKey }),
  })
}

type UpdateInput = CreateInput & { id: string }

export function useUpdateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateInput) => {
      const res = await client.api.notes[':id'].$put({ param: { id }, json: body })
      if (!res.ok) throw new Error('Failed to update note')
      return res.json()
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: notesKey })
      qc.invalidateQueries({ queryKey: [...notesKey, 'detail', vars.id] })
    },
  })
}

export function useTogglePin() {
  const update = useUpdateNote()
  return (id: string, isPinned: boolean) => update.mutate({ id, isPinned })
}

export function useTrashNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await client.api.notes[':id'].$delete({ param: { id } })
      if (!res.ok) throw new Error('Failed to trash note')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: notesKey }),
  })
}

export function useRestoreNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await client.api.notes[':id'].restore.$post({ param: { id } })
      if (!res.ok) throw new Error('Failed to restore note')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: notesKey }),
  })
}

export function usePermanentDeleteNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await client.api.notes[':id'].permanent.$delete({ param: { id } })
      if (!res.ok) throw new Error('Failed to permanently delete note')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: notesKey }),
  })
}
