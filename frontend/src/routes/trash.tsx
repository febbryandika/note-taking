import { createFileRoute, redirect } from '@tanstack/react-router'
import { RotateCcw, Trash2 } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import {
  useNotes,
  usePermanentDeleteNote,
  useRestoreNote,
} from '@/hooks/useNotes'
import { NotebookSidebar } from '@/components/notes/NotebookSidebar'
import { Skeleton } from '@/components/ui/Skeleton'

export const Route = createFileRoute('/trash')({
  beforeLoad: async () => {
    const { data } = await authClient.getSession()
    if (!data?.session) throw redirect({ to: '/login' })
  },
  component: TrashPage,
})

function TrashPage() {
  return (
    <div className="grid h-[calc(100vh-8rem)] grid-cols-[220px_1fr] gap-4">
      <aside className="overflow-y-auto border-r border-border pr-2">
        <NotebookSidebar />
      </aside>
      <section className="overflow-y-auto px-2">
        <TrashList />
      </section>
    </div>
  )
}

function TrashList() {
  const trashed = useNotes({ trashed: true })
  const restore = useRestoreNote()
  const permanentDelete = usePermanentDeleteNote()

  function handlePermanentDelete(id: string, title: string) {
    if (!window.confirm(`Permanently delete "${title || 'Untitled'}"? This cannot be undone.`)) {
      return
    }
    permanentDelete.mutate(id)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Trash</h1>

      {trashed.isLoading ? (
        <ul className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="space-y-2 rounded-md border border-border p-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/3" />
            </li>
          ))}
        </ul>
      ) : trashed.data && trashed.data.length > 0 ? (
        <ul className="divide-y divide-border rounded-md border border-border">
          {trashed.data.map((n) => (
            <li key={n.id} className="flex items-start gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{n.title || 'Untitled'}</p>
                {n.bodyText && (
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {n.bodyText.slice(0, 120)}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Trashed {n.trashedAt ? new Date(n.trashedAt).toLocaleString() : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => restore.mutate(n.id)}
                  disabled={restore.isPending}
                  className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
                  aria-label="Restore"
                  title="Restore"
                >
                  <RotateCcw className="h-4 w-4" />
                  Restore
                </button>
                <button
                  type="button"
                  onClick={() => handlePermanentDelete(n.id, n.title)}
                  disabled={permanentDelete.isPending}
                  className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-1 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  aria-label="Delete permanently"
                  title="Delete permanently"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border py-12 text-center">
          <Trash2 className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm font-medium">Trash is empty</p>
          <p className="text-xs text-muted-foreground">Deleted notes show up here.</p>
        </div>
      )}
    </div>
  )
}
