import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/client'

export const notebooksKey = ['notebooks'] as const

export function useNotebooks() {
  return useQuery({
    queryKey: notebooksKey,
    queryFn: async () => {
      const res = await client.api.notebooks.$get()
      if (!res.ok) throw new Error('Failed to load notebooks')
      return res.json()
    },
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
    onSuccess: () => qc.invalidateQueries({ queryKey: notebooksKey }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: notebooksKey }),
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
      qc.invalidateQueries({ queryKey: notebooksKey })
      qc.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}
