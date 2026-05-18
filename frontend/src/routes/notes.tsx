import { createFileRoute, Outlet, redirect, useParams } from '@tanstack/react-router'
import { z } from 'zod'
import { NotebookSidebar } from '@/components/notes/NotebookSidebar'
import { NoteList } from '@/components/notes/NoteList'
import { authClient } from '@/lib/auth-client'

const notesSearchSchema = z.object({
  notebookId: z.string().optional(),
  edit: z.boolean().optional(),
})

export const Route = createFileRoute('/notes')({
  validateSearch: notesSearchSchema,
  beforeLoad: async () => {
    const { data } = await authClient.getSession()
    if (!data?.session) throw redirect({ to: '/login' })
  },
  component: NotesLayout,
})

function NotesLayout() {
  const params = useParams({ strict: false })
  const search = Route.useSearch()
  const isOnDetail = Boolean(params.noteId)

  return (
    <div
      className={`grid h-[calc(100vh-8rem)] gap-4 ${
        isOnDetail ? 'grid-cols-[220px_320px_1fr]' : 'grid-cols-[220px_1fr]'
      }`}
    >
      <aside className="overflow-y-auto border-r border-border pr-2">
        <NotebookSidebar activeNotebookId={search.notebookId ?? 'all'} />
      </aside>
      <section
        className={`overflow-y-auto ${isOnDetail ? 'border-r border-border pr-2' : ''}`}
      >
        <NoteList />
      </section>
      {isOnDetail && (
        <section className="overflow-y-auto px-2">
          <Outlet />
        </section>
      )}
    </div>
  )
}
