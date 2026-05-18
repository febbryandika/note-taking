import { useQuery } from '@tanstack/react-query'
import { client } from '@/lib/client'
import { queryKeys } from './queryKeys'

const TAG_STALE_MS = 30_000

export function useTags() {
  return useQuery({
    queryKey: queryKeys.tags.all,
    queryFn: async () => {
      const res = await client.api.tags.$get()
      if (!res.ok) throw new Error('Failed to load tags')
      return res.json()
    },
    staleTime: TAG_STALE_MS,
  })
}
