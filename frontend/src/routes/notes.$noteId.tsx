import { createFileRoute, Link } from '@tanstack/react-router'
import { NoteEditor } from '@/components/notes/NoteEditor'
import { Skeleton } from '@/components/ui/Skeleton'
import { client } from '@/lib/client'

export const Route = createFileRoute('/notes/$noteId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData({
      queryKey: ['notes', 'detail', params.noteId],
      queryFn: async () => {
        const res = await client.api.notes[':id'].$get({ param: { id: params.noteId } })
        if (!res.ok) throw new Error('Note not found')
        return res.json()
      },
    }),
  pendingComponent: () => (
    <div className="space-y-3">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  ),
  errorComponent: () => (
    <div className="space-y-3">
      <p className="text-sm text-destructive">Note not found.</p>
      <Link to="/notes" className="text-sm text-primary underline underline-offset-2">
        Back to notes
      </Link>
    </div>
  ),
  component: NoteRoute,
})

function NoteRoute() {
  const { noteId } = Route.useParams()
  return <NoteEditor key={noteId} noteId={noteId} />
}
