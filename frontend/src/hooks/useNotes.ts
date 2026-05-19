import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import type { InferResponseType } from 'hono/client'
import { client } from '@/lib/client'
import { queryKeys, type NoteFilters } from './queryKeys'

export type { NoteFilters } from './queryKeys'

export type Note = InferResponseType<(typeof client.api.notes)[':id']['$get'], 200>

const NOTE_STALE_MS = 30_000

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
    queryKey: queryKeys.notes.list(filters),
    queryFn: async () => {
      const res = await client.api.notes.$get({ query: queryFromFilters(filters) })
      if (!res.ok) throw new Error('Failed to load notes')
      return res.json()
    },
    staleTime: NOTE_STALE_MS,
  })
}

export function useSearchNotes(q: string) {
  const trimmed = q.trim()
  return useQuery({
    queryKey: queryKeys.notes.search(trimmed),
    queryFn: async () => {
      const res = await client.api.notes.search.$get({ query: { q: trimmed } })
      if (!res.ok) throw new Error('Search failed')
      return res.json()
    },
    enabled: trimmed.length > 0,
    staleTime: NOTE_STALE_MS,
  })
}

export function useNote(id: string) {
  return useQuery({
    queryKey: queryKeys.notes.detail(id),
    queryFn: async () => {
      const res = await client.api.notes[':id'].$get({ param: { id } })
      if (!res.ok) throw new Error('Failed to load note')
      return res.json()
    },
    enabled: Boolean(id),
    staleTime: NOTE_STALE_MS,
  })
}

type CreateInput = {
  title?: string
  bodyJson?: string
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
    onSuccess: (created) => {
      qc.setQueryData(queryKeys.notes.detail(created.id), created)
      qc.invalidateQueries({ queryKey: queryKeys.notes.all })
      qc.invalidateQueries({ queryKey: queryKeys.tags.all })
    },
  })
}

type UpdateInput = CreateInput & { id: string }

type ListSnapshot = { key: QueryKey; data: Note[] | undefined }

function applyPatchToNote(n: Note, patch: Partial<Note>): Note {
  return { ...n, ...patch, updatedAt: new Date().toISOString() }
}

function sortNotes(list: Note[]): Note[] {
  return [...list].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}

async function patchListsOptimistically(
  qc: ReturnType<typeof useQueryClient>,
  id: string,
  patch: Partial<Note>,
): Promise<ListSnapshot[]> {
  await qc.cancelQueries({ queryKey: queryKeys.notes.all })
  const lists = qc.getQueriesData<Note[]>({ queryKey: ['notes', 'list'] })
  const snapshots: ListSnapshot[] = lists.map(([key, data]) => ({ key, data }))
  for (const [key, data] of lists) {
    if (!data) continue
    const next = data.map((n) => (n.id === id ? applyPatchToNote(n, patch) : n))
    qc.setQueryData<Note[]>(key, sortNotes(next))
  }
  return snapshots
}

function restoreLists(qc: ReturnType<typeof useQueryClient>, snapshots: ListSnapshot[]) {
  for (const { key, data } of snapshots) {
    qc.setQueryData(key, data)
  }
}

export function useUpdateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateInput) => {
      const res = await client.api.notes[':id'].$put({ param: { id }, json: body })
      if (!res.ok) throw new Error('Failed to update note')
      return res.json()
    },
    onMutate: async ({ id, ...patch }) => {
      const prevDetail = qc.getQueryData<Note>(queryKeys.notes.detail(id))
      if (prevDetail) {
        qc.setQueryData<Note>(queryKeys.notes.detail(id), applyPatchToNote(prevDetail, patch as Partial<Note>))
      }
      const listSnapshots = await patchListsOptimistically(qc, id, patch as Partial<Note>)
      return { prevDetail, listSnapshots }
    },
    onError: (_err, vars, ctx) => {
      if (ctx?.prevDetail) qc.setQueryData(queryKeys.notes.detail(vars.id), ctx.prevDetail)
      if (ctx?.listSnapshots) restoreLists(qc, ctx.listSnapshots)
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.notes.detail(vars.id) })
      qc.invalidateQueries({ queryKey: queryKeys.notes.all })
      qc.invalidateQueries({ queryKey: queryKeys.tags.all })
    },
  })
}

export function useTogglePin() {
  const update = useUpdateNote()
  return (id: string, isPinned: boolean) => update.mutate({ id, isPinned })
}

export function useDeleteNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await client.api.notes[':id'].$delete({ param: { id } })
      if (!res.ok) throw new Error('Failed to trash note')
      return res.json()
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.notes.all })
      const lists = qc.getQueriesData<Note[]>({ queryKey: ['notes', 'list'] })
      const snapshots: ListSnapshot[] = lists.map(([key, data]) => ({ key, data }))
      const trashedAt = new Date().toISOString()
      for (const [key, data] of lists) {
        if (!data) continue
        const filters = (key as readonly unknown[])[2] as NoteFilters | undefined
        if (filters?.trashed === true) {
          qc.setQueryData<Note[]>(
            key,
            data.map((n) => (n.id === id ? { ...n, trashedAt } : n)),
          )
        } else {
          qc.setQueryData<Note[]>(key, data.filter((n) => n.id !== id))
        }
      }
      // Trashed notes are no longer reachable via GET /:id (backend returns 404).
      // Drop the detail cache so route loader re-fetches on back-nav and surfaces the 404.
      qc.removeQueries({ queryKey: queryKeys.notes.detail(id) })
      return { listSnapshots: snapshots }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.listSnapshots) restoreLists(qc, ctx.listSnapshots)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notes.all })
      qc.invalidateQueries({ queryKey: queryKeys.tags.all })
    },
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
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.notes.all })
      const lists = qc.getQueriesData<Note[]>({ queryKey: ['notes', 'list'] })
      const snapshots: ListSnapshot[] = lists.map(([key, data]) => ({ key, data }))
      for (const [key, data] of lists) {
        if (!data) continue
        const filters = (key as readonly unknown[])[2] as NoteFilters | undefined
        if (filters?.trashed === true) {
          qc.setQueryData<Note[]>(key, data.filter((n) => n.id !== id))
        }
      }
      return { listSnapshots: snapshots }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.listSnapshots) restoreLists(qc, ctx.listSnapshots)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notes.all })
      qc.invalidateQueries({ queryKey: queryKeys.tags.all })
    },
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
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.notes.all })
      const lists = qc.getQueriesData<Note[]>({ queryKey: ['notes', 'list'] })
      const snapshots: ListSnapshot[] = lists.map(([key, data]) => ({ key, data }))
      for (const [key, data] of lists) {
        if (!data) continue
        qc.setQueryData<Note[]>(key, data.filter((n) => n.id !== id))
      }
      qc.removeQueries({ queryKey: queryKeys.notes.detail(id) })
      return { listSnapshots: snapshots }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.listSnapshots) restoreLists(qc, ctx.listSnapshots)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notes.all })
      qc.invalidateQueries({ queryKey: queryKeys.tags.all })
    },
  })
}
