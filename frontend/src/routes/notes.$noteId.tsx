import { useEffect, useRef } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { NoteEditor } from '@/components/notes/NoteEditor'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { queryKeys } from '@/hooks/queryKeys'
import { client } from '@/lib/client'

export const Route = createFileRoute('/notes/$noteId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData({
      queryKey: queryKeys.notes.detail(params.noteId),
      queryFn: async () => {
        const res = await client.api.notes[':id'].$get({ param: { id: params.noteId } })
        if (!res.ok) throw new Error('Note not found')
        return res.json()
      },
    }),
  pendingComponent: () => (
    <div className="mx-auto max-w-[720px] space-y-3 px-7 py-12">
      <Skeleton className="h-8 w-2/3 bg-paper-soft" />
      <Skeleton className="h-4 w-full bg-paper-soft" />
      <Skeleton className="h-64 w-full bg-paper-soft" />
    </div>
  ),
  errorComponent: NoteNotFoundRedirect,
  component: NoteRoute,
})

function NoteRoute() {
  const { noteId } = Route.useParams()
  return <NoteEditor key={noteId} noteId={noteId} />
}

function NoteNotFoundRedirect() {
  const navigate = useNavigate()
  const toast = useToast()
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    toast.error('Note not found')
    navigate({ to: '/notes', search: (prev) => prev, replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
