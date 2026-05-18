import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { BookOpen, Pencil, Plus, Trash2, X } from 'lucide-react'
import {
  useCreateNotebook,
  useDeleteNotebook,
  useNotebooks,
  useRenameNotebook,
} from '@/hooks/useNotebooks'
import { useToast } from '@/components/ui/Toast'
import { NotebookFormModal } from './NotebookFormModal'
import { ConfirmModal } from './ConfirmModal'
import { TagCloud } from './TagCloud'

type Notebook = { id: string; name: string }

export function NotebookSidebar({
  activeNotebookId,
  activeTag,
}: {
  activeNotebookId?: string | 'all' | null
  activeTag?: string
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
          className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
            activeNotebookId === 'all'
              ? 'bg-primary/10 font-medium text-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <BookOpen className="h-4 w-4 shrink-0" />
          <span className="truncate">All notes</span>
        </Link>

        {notebooks.data?.map((nb) => {
          const active = activeNotebookId === nb.id
          return (
            <div key={nb.id} className="group relative">
              <Link
                to="/notes"
                search={{ notebookId: nb.id }}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                  active
                    ? 'bg-primary/10 font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <BookOpen className="h-4 w-4 shrink-0" />
                <span className="truncate">{nb.name}</span>
              </Link>
              <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden items-center gap-0.5 group-hover:flex">
                <button
                  type="button"
                  onClick={() => setRenameTarget(nb)}
                  className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                  aria-label="Rename notebook"
                  title="Rename notebook"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(nb)}
                  className="rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive"
                  aria-label="Delete notebook"
                  title="Delete notebook"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <TagCloud activeTag={activeTag} />

      <div className="space-y-1 border-t border-border pt-3">
        <Link
          to="/trash"
          activeProps={{ className: 'bg-primary/10 font-medium text-foreground' }}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
