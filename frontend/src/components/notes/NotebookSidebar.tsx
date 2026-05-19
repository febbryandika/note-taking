import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { BookOpen, Pencil, Plus, Trash2, X } from 'lucide-react'
import {
  useCreateNotebook,
  useDeleteNotebook,
  useNotebooks,
  useRenameNotebook,
} from '@/hooks/useNotebooks'
import { QueryError } from '@/components/ui/QueryError'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { NotebookFormModal } from './NotebookFormModal'
import { ConfirmModal } from './ConfirmModal'
import { TagCloud } from './TagCloud'

type Notebook = { id: string; name: string }

export function NotebookSidebar({
  activeNotebookId,
  activeTag,
  onNavigate,
}: {
  activeNotebookId?: string | 'all' | null
  activeTag?: string
  onNavigate?: () => void
}) {
  const notebooks = useNotebooks()
  const createNotebook = useCreateNotebook()
  const renameNotebook = useRenameNotebook()
  const deleteNotebook = useDeleteNotebook()
  const toast = useToast()

  const [createOpen, setCreateOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<Notebook | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Notebook | null>(null)

  const existingNames = notebooks.data?.map((nb) => nb.name) ?? []

  async function handleCreate(name: string) {
    try {
      await createNotebook.mutateAsync(name)
      toast.success(`Notebook "${name}" created`)
      setCreateOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create notebook')
    }
  }

  async function handleRename(name: string) {
    if (!renameTarget) return
    try {
      await renameNotebook.mutateAsync({ id: renameTarget.id, name })
      toast.success('Notebook renamed')
      setRenameTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to rename notebook')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const target = deleteTarget
    try {
      await deleteNotebook.mutateAsync(target.id)
      toast.success(`Notebook "${target.name}" deleted`)
      setDeleteTarget(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete notebook'
      if (message === 'Notebook has notes') {
        toast.error('Cannot delete — move or trash the notes inside first.')
      } else {
        toast.error(message)
      }
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center justify-between px-1 pb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Notebooks
          </h2>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            disabled={createNotebook.isPending}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
            aria-label="New notebook"
            title="New notebook"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <Link
          to="/notes"
          search={{}}
          onClick={() => onNavigate?.()}
          className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors md:py-1.5 md:text-xs ${
            activeNotebookId === 'all'
              ? 'bg-primary/10 font-medium text-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <BookOpen className="h-4 w-4 shrink-0" />
          <span className="truncate">All notes</span>
        </Link>

        {notebooks.isError && !notebooks.data ? (
          <div className="px-1 pt-1">
            <QueryError
              compact
              message="Couldn’t load notebooks."
              onRetry={() => notebooks.refetch()}
              isRetrying={notebooks.isFetching}
            />
          </div>
        ) : notebooks.isLoading ? (
          <div className="space-y-1 px-1 pt-1" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : notebooks.data && notebooks.data.length === 0 ? (
          <p className="px-2 pt-1 text-xs italic text-muted-foreground">
            No notebooks yet — click + to create one.
          </p>
        ) : null}

        {notebooks.data?.map((nb) => {
          const active = activeNotebookId === nb.id
          return (
            <div key={nb.id} className="group relative">
              <Link
                to="/notes"
                search={{ notebookId: nb.id }}
                onClick={() => onNavigate?.()}
                className={`flex items-center gap-2 rounded-md py-2 pl-2 pr-16 text-sm transition-colors md:py-1.5 md:pr-2 md:text-xs ${
                  active
                    ? 'bg-primary/10 font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <BookOpen className="h-4 w-4 shrink-0" />
                <span className="truncate">{nb.name}</span>
              </Link>
              <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5 md:hidden md:group-hover:flex">
                <button
                  type="button"
                  onClick={() => setRenameTarget(nb)}
                  className="rounded p-2 text-muted-foreground hover:bg-background hover:text-foreground md:p-1"
                  aria-label="Rename notebook"
                  title="Rename notebook"
                >
                  <Pencil className="h-3.5 w-3.5 md:h-3 md:w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(nb)}
                  className="rounded p-2 text-muted-foreground hover:bg-background hover:text-destructive md:p-1"
                  aria-label="Delete notebook"
                  title="Delete notebook"
                >
                  <X className="h-3.5 w-3.5 md:h-3 md:w-3" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <TagCloud activeTag={activeTag} onNavigate={onNavigate} />

      <div className="space-y-1 border-t border-border pt-3">
        <Link
          to="/trash"
          onClick={() => onNavigate?.()}
          activeProps={{ className: 'bg-primary/10 font-medium text-foreground' }}
          className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:py-1.5"
        >
          <Trash2 className="h-4 w-4 shrink-0" />
          <span className="truncate">Trash</span>
        </Link>
      </div>

      <NotebookFormModal
        open={createOpen}
        mode="create"
        existingNames={existingNames}
        isPending={createNotebook.isPending}
        onSubmit={handleCreate}
        onClose={() => setCreateOpen(false)}
      />

      <NotebookFormModal
        open={renameTarget !== null}
        mode="rename"
        initialName={renameTarget?.name ?? ''}
        existingNames={existingNames}
        isPending={renameNotebook.isPending}
        onSubmit={handleRename}
        onClose={() => setRenameTarget(null)}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete notebook?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" will be permanently removed. Notes inside must be moved or trashed first.`
            : ''
        }
        confirmLabel="Delete"
        destructive
        isPending={deleteNotebook.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
