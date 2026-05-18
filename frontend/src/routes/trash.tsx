import { useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { RotateCcw, Trash2 } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import {
  useNotes,
  usePermanentDeleteNote,
  useRestoreNote,
} from '@/hooks/useNotes'
import { NotebookSidebar } from '@/components/notes/NotebookSidebar'
import { ConfirmModal } from '@/components/notes/ConfirmModal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

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

type DeleteTarget = { id: string; title: string }

function TrashList() {
  const trashed = useNotes({ trashed: true })
  const restore = useRestoreNote()
  const permanentDelete = usePermanentDeleteNote()
  const toast = useToast()

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  async function handleRestore(id: string) {
    try {
      await restore.mutateAsync(id)
      toast.success('Note restored')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to restore note')
    }
  }

  async function handlePermanentDelete() {
    if (!deleteTarget) return
    const target = deleteTarget
    try {
      await permanentDelete.mutateAsync(target.id)
      toast.success(`"${target.title || 'Untitled'}" deleted permanently`)
      setDeleteTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete note')
      setDeleteTarget(null)
    }
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
                  onClick={() => handleRestore(n.id)}
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
                  onClick={() => setDeleteTarget({ id: n.id, title: n.title })}
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

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete permanently?"
        description={
          deleteTarget
            ? `"${deleteTarget.title || 'Untitled'}" will be permanently deleted. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete permanently"
        destructive
        isPending={permanentDelete.isPending}
        onConfirm={handlePermanentDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
