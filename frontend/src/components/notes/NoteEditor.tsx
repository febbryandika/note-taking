import { useEffect, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Pencil, Star, Trash2 } from 'lucide-react'
import { useNotebooks } from '@/hooks/useNotebooks'
import { useNote, useTrashNote, useUpdateNote } from '@/hooks/useNotes'
import { Skeleton } from '@/components/ui/Skeleton'

function tagsToCsv(tags: string[]) {
  return tags.join(', ')
}

function csvToTags(csv: string) {
  return csv
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
}

export function NoteEditor({ noteId }: { noteId: string }) {
  const navigate = useNavigate()
  const search = useSearch({ from: '/notes' })
  const note = useNote(noteId)
  const notebooks = useNotebooks()
  const updateNote = useUpdateNote()
  const trashNote = useTrashNote()

  const [mode, setMode] = useState<'read' | 'edit'>(search.edit === true ? 'edit' : 'read')

  useEffect(() => {
    if (search.edit !== true) return
    navigate({
      to: '/notes/$noteId',
      params: { noteId },
      search: ({ edit: _edit, ...rest }) => rest,
      replace: true,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [title, setTitle] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [notebookId, setNotebookId] = useState<string | null>(null)
  const [tagsCsv, setTagsCsv] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!note.data) return
    setTitle(note.data.title)
    setBodyText(note.data.bodyText)
    setNotebookId(note.data.notebookId)
    setTagsCsv(tagsToCsv(note.data.tags))
    setIsPinned(note.data.isPinned)
  }, [note.data])

  if (!note.data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  async function handleSave() {
    setError('')
    try {
      await updateNote.mutateAsync({
        id: noteId,
        title,
        bodyText,
        notebookId,
        tags: csvToTags(tagsCsv),
        isPinned,
      })
      setMode('read')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  function handleCancel() {
    if (!note.data) return
    setTitle(note.data.title)
    setBodyText(note.data.bodyText)
    setNotebookId(note.data.notebookId)
    setTagsCsv(tagsToCsv(note.data.tags))
    setIsPinned(note.data.isPinned)
    setError('')
    setMode('read')
  }

  async function handleTrash() {
    await trashNote.mutateAsync(noteId)
    navigate({ to: '/notes', search: (prev) => prev })
  }

  if (mode === 'read') {
    const notebook = notebooks.data?.find((nb) => nb.id === note.data!.notebookId)
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-end gap-3 text-xs text-muted-foreground">
          <span>Updated {new Date(note.data.updatedAt).toLocaleString()}</span>
          <button
            type="button"
            onClick={() => setMode('edit')}
            className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-1 hover:bg-muted"
            aria-label="Edit"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={handleTrash}
            disabled={trashNote.isPending}
            className="inline-flex items-center gap-1 hover:text-destructive disabled:opacity-50"
            aria-label="Move to trash"
            title="Move to trash"
          >
            <Trash2 className="h-4 w-4" />
            Trash
          </button>
        </div>

        <div className="flex items-start gap-2">
          {note.data.isPinned && (
            <Star className="mt-1.5 h-5 w-5 shrink-0 text-yellow-500" fill="currentColor" />
          )}
          <h1 className="text-2xl font-semibold leading-tight">
            {note.data.title || 'Untitled'}
          </h1>
        </div>

        {(notebook || note.data.tags.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {notebook && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-foreground/70">
                {notebook.name}
              </span>
            )}
            {note.data.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-2 py-0.5 text-foreground/70"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {note.data.bodyText ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{note.data.bodyText}</div>
        ) : (
          <p className="text-sm italic text-muted-foreground">No content yet — click Edit to start writing.</p>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-end gap-3 text-xs text-muted-foreground">
        <span>
          {updateNote.isPending ? 'Saving…' : 'Editing'}
        </span>
        <button
          type="button"
          onClick={handleCancel}
          disabled={updateNote.isPending}
          className="inline-flex items-center rounded-md border border-input px-2 py-1 hover:bg-muted disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={updateNote.isPending}
          className="inline-flex items-center rounded-md bg-primary px-3 py-1 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {updateNote.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Notebook</span>
          <select
            value={notebookId ?? ''}
            onChange={(e) => setNotebookId(e.target.value || null)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">No notebook</option>
            {notebooks.data?.map((nb) => (
              <option key={nb.id} value={nb.id}>
                {nb.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="text-muted-foreground">Tags (comma-separated)</span>
          <input
            type="text"
            value={tagsCsv}
            onChange={(e) => setTagsCsv(e.target.value)}
            placeholder="work, ideas, todo"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
      </div>

      <textarea
        value={bodyText}
        onChange={(e) => setBodyText(e.target.value)}
        rows={20}
        placeholder="Start writing…"
        className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="flex items-center justify-between">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
          />
          <span>Pin to top</span>
        </label>

        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    </div>
  )
}
