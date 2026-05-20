import { useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
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
      <div className="min-h-screen bg-paper font-display text-ink">
        <Drawer open={drawerOpen} onClose={closeDrawer} ariaLabel="Notebooks and tags">
          <NotebookSidebar onNavigate={closeDrawer} />
        </Drawer>
        <div className="h-[100dvh] overflow-y-auto">
          <TrashList onOpenSidebar={() => setDrawerOpen(true)} />
        </div>
      </div>
    )
  }

  return (
    <div className="grid h-screen min-h-0 grid-cols-[260px_1fr] bg-paper font-display text-[15px] leading-[1.55] tracking-[-0.005em] text-ink">
      <NotebookSidebar />
      <section className="flex min-h-0 flex-col bg-paper-surface">
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
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2.5 border-b border-paper-line bg-paper-surface px-7 py-3.5">
        {onOpenSidebar && (
          <button
            type="button"
            onClick={onOpenSidebar}
            className="grid h-8 w-8 place-items-center rounded-md text-ink-muted hover:bg-paper-soft hover:text-ink"
            aria-label="Open menu"
          >
            <MenuIcon />
          </button>
        )}
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">Trash</h1>
        <span className="ml-3 text-[13px] text-ink-faint">Restore within 30 days</span>
      </header>

      <div className="mx-auto w-full max-w-[820px] flex-1 overflow-y-auto px-7 pb-24 pt-10 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-paper-line">
        {trashed.isError && !trashed.data ? (
          <QueryError
            message="Couldn't load trash."
            onRetry={() => trashed.refetch()}
            isRetrying={trashed.isFetching}
          />
        ) : trashed.isLoading ? (
          <ul className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="space-y-2 rounded-[10px] border border-paper-line p-4">
                <Skeleton className="h-4 w-2/3 bg-paper-soft" />
                <Skeleton className="h-3 w-full bg-paper-soft" />
                <Skeleton className="h-3 w-1/3 bg-paper-soft" />
              </li>
            ))}
          </ul>
        ) : trashed.data && trashed.data.length > 0 ? (
          <ul className="overflow-hidden rounded-2xl border border-paper-line bg-paper-surface">
            {trashed.data.map((n, idx) => (
              <li
                key={n.id}
                className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center ${idx > 0 ? 'border-t border-paper-line' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-ink">{n.title || 'Untitled'}</p>
                  {n.bodyText && (
                    <p className="mt-0.5 truncate text-[13px] text-ink-muted">
                      {n.bodyText.slice(0, 160)}
                    </p>
                  )}
                  <p className="mt-1 text-[11.5px] text-ink-faint">
                    Trashed {n.trashedAt ? new Date(n.trashedAt).toLocaleString() : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[13px]">
                  <button
                    type="button"
                    onClick={() => handleRestore(n.id)}
                    disabled={restore.isPending}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-paper-line-strong bg-paper px-3 py-1.5 font-medium text-ink-muted transition hover:bg-paper-soft hover:text-ink disabled:opacity-50"
                    aria-label="Restore"
                    title="Restore"
                  >
                    <RestoreIcon />
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ id: n.id, title: n.title })}
                    disabled={permanentDelete.isPending}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-300 bg-paper px-3 py-1.5 font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    aria-label="Delete permanently"
                    title="Delete permanently"
                  >
                    <SmallTrashIcon />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid place-items-center rounded-2xl border border-dashed border-paper-line bg-paper-surface py-16 text-center">
            <div>
              <div className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-2xl bg-paper-soft text-ink-muted">
                <BigTrashIcon />
              </div>
              <p className="text-[16px] font-semibold text-ink">Trash is empty</p>
              <p className="mt-1 text-[13.5px] text-ink-faint">Deleted notes show up here.</p>
            </div>
          </div>
        )}
      </div>

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

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  )
}

function RestoreIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}

function SmallTrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
    </svg>
  )
}

function BigTrashIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
    </svg>
  )
}
