import { useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Menu, RotateCcw, Trash2 } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import {
  useCreateNote,
  useNotes,
  usePermanentDeleteNote,
  useRestoreNote,
} from '@/hooks/useNotes'
import { NotebookSidebar } from '@/components/notes/NotebookSidebar'
import { ConfirmModal } from '@/components/notes/ConfirmModal'
import { Drawer } from '@/components/ui/Drawer'
import { QueryError } from '@/components/ui/QueryError'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'

export const Route = createFileRoute('/trash')({
  beforeLoad: async () => {
    const { data } = await authClient.getSession()
    if (!data?.session) throw redirect({ to: '/login' })
  },
  component: TrashPage,
})

function TrashPage() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const closeDrawer = () => setDrawerOpen(false)
  const createNote = useCreateNote()
  const toast = useToast()

  useKeyboardShortcut({ key: 'n', mod: true }, async (e) => {
    e.preventDefault()
    try {
      const created = await createNote.mutateAsync({})
      navigate({
        to: '/notes/$noteId',
        params: { noteId: created.id },
        search: { edit: true },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create note')
    }
  })

  useKeyboardShortcut({ key: 'Escape' }, () => {
    if (drawerOpen) setDrawerOpen(false)
  })

  if (!isDesktop) {
    return (
      <>
        <Drawer open={drawerOpen} onClose={closeDrawer} ariaLabel="Notebooks and tags">
          <NotebookSidebar onNavigate={closeDrawer} />
        </Drawer>
        <div className="h-[calc(100dvh-7rem)] overflow-y-auto">
          <TrashList onOpenSidebar={() => setDrawerOpen(true)} />
        </div>
      </>
    )
  }

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

function TrashList({ onOpenSidebar }: { onOpenSidebar?: () => void }) {
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
      <div className="flex items-center gap-2">
        {onOpenSidebar && (
          <button
            type="button"
            onClick={onOpenSidebar}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <h1 className="text-2xl font-semibold">Trash</h1>
      </div>

      {trashed.isError && !trashed.data ? (
        <QueryError
          message="Couldn’t load trash."
          onRetry={() => trashed.refetch()}
          isRetrying={trashed.isFetching}
        />
      ) : trashed.isLoading ? (
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
            <li
              key={n.id}
              className="flex flex-col gap-3 p-3 sm:flex-row sm:items-start"
            >
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
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-input px-3 py-2 text-muted-foreground hover:text-foreground disabled:opacity-50 sm:flex-initial sm:py-1"
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
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-destructive/40 px-3 py-2 text-destructive hover:bg-destructive/10 disabled:opacity-50 sm:flex-initial sm:py-1"
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
