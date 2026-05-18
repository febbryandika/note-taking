import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { FileText, Plus, Star, Trash2 } from 'lucide-react'
import { useCreateNote, useDeleteNote, useNotes, useTogglePin, type Note } from '@/hooks/useNotes'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

export function NoteList() {
  const navigate = useNavigate()
  const search = useSearch({ from: '/notes' })
  const params = useParams({ strict: false }) as { noteId?: string }
  const activeNoteId = params.noteId
  const notes = useNotes({
    ...(search.notebookId ? { notebookId: search.notebookId } : {}),
    ...(search.tag ? { tag: search.tag } : {}),
  })
  const createNote = useCreateNote()
  const togglePin = useTogglePin()
  const deleteNote = useDeleteNote()
  const toast = useToast()

  async function handleNewNote() {
    const created = await createNote.mutateAsync({
      ...(search.notebookId ? { notebookId: search.notebookId } : {}),
      ...(search.tag ? { tags: [search.tag] } : {}),
    })
    navigate({
      to: '/notes/$noteId',
      params: { noteId: created.id },
      search: (prev) => ({ ...prev, edit: true }),
    })
  }

  async function handleTrash(id: string, title: string) {
    try {
      await deleteNote.mutateAsync(id)
      toast.success(`"${title || 'Untitled'}" moved to trash`)
      if (activeNoteId === id) {
        navigate({ to: '/notes', search: (prev) => prev })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to move note to trash')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Notes</h2>
        <button
          type="button"
          onClick={handleNewNote}
          disabled={createNote.isPending}
          className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
          aria-label="New note"
          title="New note"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </button>
      </div>

      {notes.isLoading ? (
        <ul className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="space-y-1.5 rounded-md border border-border p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </li>
          ))}
        </ul>
      ) : notes.data && notes.data.length > 0 ? (
        (() => {
          const pinned = notes.data.filter((n) => n.isPinned)
          const others = notes.data.filter((n) => !n.isPinned)
          const renderItem = (n: Note) => (
            <li key={n.id}>
              <Link
                to="/notes/$noteId"
                params={{ noteId: n.id }}
                search={(prev) => prev}
                activeProps={{
                  className: 'border-primary bg-primary/5',
                }}
                className="group flex items-start gap-2 rounded-md border border-border p-3 transition-colors hover:bg-muted"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    togglePin(n.id, !n.isPinned)
                  }}
                  className={`mt-0.5 shrink-0 ${
                    n.isPinned ? 'text-yellow-500' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-label={n.isPinned ? 'Unpin' : 'Pin'}
                  aria-pressed={n.isPinned}
                  title={n.isPinned ? 'Unpin' : 'Pin'}
                >
                  <Star className="h-3.5 w-3.5" fill={n.isPinned ? 'currentColor' : 'none'} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{n.title || 'Untitled'}</p>
                  {n.bodyText && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {n.bodyText.slice(0, 100)}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                    {n.tags.slice(0, 3).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          navigate({ to: '/notes', search: { tag } })
                        }}
                        className="rounded-full bg-muted px-1.5 py-0.5 text-foreground/70 hover:bg-muted/70 hover:text-foreground"
                      >
                        #{tag}
                      </button>
                    ))}
                    <span className="ml-auto">{new Date(n.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleTrash(n.id, n.title)
                  }}
                  disabled={deleteNote.isPending}
                  className="mt-0.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive disabled:opacity-50"
                  aria-label="Move to trash"
                  title="Move to trash"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </Link>
            </li>
          )
          return (
            <div className="space-y-3">
              {pinned.length > 0 && (
                <div className="space-y-1.5">
                  <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    <Star className="h-3 w-3" fill="currentColor" />
                    Pinned
                  </p>
                  <ul className="space-y-1">{pinned.map(renderItem)}</ul>
                </div>
              )}
              {others.length > 0 && (
                <div className="space-y-1.5">
                  {pinned.length > 0 && (
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Others
                    </p>
                  )}
                  <ul className="space-y-1">{others.map(renderItem)}</ul>
                </div>
              )}
            </div>
          )
        })()
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border py-12 text-center">
          <FileText className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm font-medium">No notes yet</p>
          <p className="text-xs text-muted-foreground">
            Click <span className="font-medium">New</span> to create one.
          </p>
        </div>
      )}
    </div>
  )
}
