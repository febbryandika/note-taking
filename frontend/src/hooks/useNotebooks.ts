import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/client'
import { queryKeys } from './queryKeys'

const NOTEBOOK_STALE_MS = 60_000

export function useNotebooks() {
  return useQuery({
    queryKey: queryKeys.notebooks.all,
    queryFn: async () => {
      const res = await client.api.notebooks.$get()
      if (!res.ok) throw new Error('Failed to load notebooks')
      return res.json()
    },
    staleTime: NOTEBOOK_STALE_MS,
  })
}

export function useCreateNotebook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await client.api.notebooks.$post({ json: { name } })
      if (!res.ok) throw new Error('Failed to create notebook')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notebooks.all }),
  })
}

export function useRenameNotebook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await client.api.notebooks[':id'].$put({
        param: { id },
        json: { name },
      })
      if (!res.ok) throw new Error('Failed to rename notebook')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notebooks.all }),
  })
}

export function useDeleteNotebook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await client.api.notebooks[':id'].$delete({ param: { id } })
      if (res.status === 409) throw new Error('Notebook has notes')
      if (!res.ok) throw new Error('Failed to delete notebook')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notebooks.all })
      qc.invalidateQueries({ queryKey: queryKeys.notes.all })
    },
  })
}
