import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { BookOpen, Pencil, Plus, Trash2, X } from 'lucide-react'
import {
  useCreateNotebook,
  useDeleteNotebook,
  useNotebooks,
  useRenameNotebook,
} from '@/hooks/useNotebooks'

export function NotebookSidebar({
  activeNotebookId,
}: {
  activeNotebookId?: string | 'all' | null
}) {
  const notebooks = useNotebooks()
  const createNotebook = useCreateNotebook()
  const renameNotebook = useRenameNotebook()
  const deleteNotebook = useDeleteNotebook()
  const [error, setError] = useState('')

  async function handleNewNotebook() {
    const name = window.prompt('Notebook name')?.trim()
    if (!name) return
    setError('')
    try {
      await createNotebook.mutateAsync(name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create')
    }
  }

  async function handleRename(id: string, currentName: string) {
    const name = window.prompt('Rename notebook', currentName)?.trim()
    if (!name || name === currentName) return
    setError('')
    try {
      await renameNotebook.mutateAsync({ id, name })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename')
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete notebook "${name}"?`)) return
    setError('')
    try {
      await deleteNotebook.mutateAsync(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
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
            onClick={handleNewNotebook}
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
                  onClick={() => handleRename(nb.id, nb.name)}
                  className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                  aria-label="Rename notebook"
                  title="Rename notebook"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(nb.id, nb.name)}
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

        {error && <p className="px-2 text-xs text-destructive">{error}</p>}
      </div>

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
    </div>
  )
}
