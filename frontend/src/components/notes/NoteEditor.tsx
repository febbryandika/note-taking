import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Pencil, Star, Trash2 } from 'lucide-react'
import { useNotebooks } from '@/hooks/useNotebooks'
import { useDeleteNote, useNote, useUpdateNote } from '@/hooks/useNotes'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { TagInput } from './TagInput'
import { TipTapEditor } from './TipTapEditor'

export function NoteEditor({ noteId }: { noteId: string }) {
  const navigate = useNavigate()
  const search = useSearch({ from: '/notes' })
  const note = useNote(noteId)
  const notebooks = useNotebooks()
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()
  const toast = useToast()

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
  const [bodyJson, setBodyJson] = useState('{}')
  const [bodyText, setBodyText] = useState('')
  const [notebookId, setNotebookId] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [isPinned, setIsPinned] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!note.data) return
    setTitle(note.data.title)
    setBodyJson(note.data.bodyJson)
    setBodyText(note.data.bodyText)
    setNotebookId(note.data.notebookId)
    setTags(note.data.tags)
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
        bodyJson,
        bodyText,
        notebookId,
        tags,
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
    setBodyJson(note.data.bodyJson)
    setBodyText(note.data.bodyText)
    setNotebookId(note.data.notebookId)
    setTags(note.data.tags)
    setIsPinned(note.data.isPinned)
    setError('')
    setMode('read')
  }

  async function handleTrash() {
    const title = note.data?.title || 'Untitled'
    try {
      await deleteNote.mutateAsync(noteId)
      toast.success(`"${title}" moved to trash`)
      navigate({ to: '/notes', search: (prev) => prev })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to move note to trash')
    }
  }

  async function handleTogglePin() {
    if (!note.data) return
    try {
      await updateNote.mutateAsync({ id: noteId, isPinned: !note.data.isPinned })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update pin')
    }
  }

  if (mode === 'read') {
    const notebook = notebooks.data?.find((nb) => nb.id === note.data!.notebookId)
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-end gap-3 text-xs text-muted-foreground">
          <span>Updated {new Date(note.data.updatedAt).toLocaleString()}</span>
          <button
            type="button"
            onClick={handleTogglePin}
            disabled={updateNote.isPending}
            className={`inline-flex items-center gap-1 rounded-md border border-input px-2 py-1 hover:bg-muted disabled:opacity-50 ${
              note.data.isPinned ? 'text-yellow-500' : ''
            }`}
            aria-label={note.data.isPinned ? 'Unpin' : 'Pin'}
            aria-pressed={note.data.isPinned}
            title={note.data.isPinned ? 'Unpin' : 'Pin'}
          >
            <Star className="h-3.5 w-3.5" fill={note.data.isPinned ? 'currentColor' : 'none'} />
            {note.data.isPinned ? 'Pinned' : 'Pin'}
          </button>
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
            disabled={deleteNote.isPending}
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
              <Link
                key={tag}
                to="/notes"
                search={{ tag }}
                className="rounded-full bg-muted px-2 py-0.5 text-foreground/70 transition-colors hover:bg-muted/70 hover:text-foreground"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {note.data.bodyText || (note.data.bodyJson && note.data.bodyJson !== '{}') ? (
          <TipTapEditor
            key={`read-${note.data.id}-${note.data.updatedAt}`}
            bodyJson={note.data.bodyJson}
            bodyText={note.data.bodyText}
            editable={false}
          />
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

        <div className="space-y-1 text-sm sm:col-span-2">
          <span className="text-muted-foreground">Tags</span>
          <TagInput tags={tags} onChange={setTags} placeholder="Type a tag, press Enter" />
        </div>
      </div>

      <TipTapEditor
        key={`edit-${noteId}`}
        bodyJson={bodyJson}
        bodyText={bodyText}
        editable
        onChange={(next) => {
          setBodyJson(next.bodyJson)
          setBodyText(next.bodyText)
        }}
        placeholder="Start writing…"
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
