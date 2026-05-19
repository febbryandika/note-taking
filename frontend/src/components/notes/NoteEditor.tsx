import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { AlertCircle, ArrowLeft, Check, Loader2, Pencil, Star, Trash2 } from 'lucide-react'
import { useNotebooks } from '@/hooks/useNotebooks'
import { useDeleteNote, useNote, useUpdateNote } from '@/hooks/useNotes'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { TagInput } from './TagInput'
import { TipTapEditor } from './TipTapEditor'

type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'
const AUTOSAVE_DELAY_MS = 1000

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

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  // versionRef increments on every user edit so the auto-save effect can
  // detect changes that happened mid-flight and avoid clearing dirty state.
  const versionRef = useRef(0)

  useEffect(() => {
    if (!note.data) return
    // Skip re-hydration while the user has unsaved local changes. After a
    // successful save the cache reflects what we just sent, so re-hydrating
    // is a no-op visually but keeps server-normalized fields authoritative.
    if (saveStatus === 'pending' || saveStatus === 'saving' || saveStatus === 'error') return
    setTitle(note.data.title)
    setBodyJson(note.data.bodyJson)
    setBodyText(note.data.bodyText)
    setNotebookId(note.data.notebookId)
    setTags(note.data.tags)
    setIsPinned(note.data.isPinned)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.data])

  function markDirty() {
    versionRef.current += 1
    setSaveStatus('pending')
  }

  async function performSave() {
    setSaveStatus('saving')
    const versionAtSave = versionRef.current
    try {
      await updateNote.mutateAsync({
        id: noteId,
        title,
        bodyJson,
        notebookId,
        tags,
        isPinned,
      })
      // If the user typed during the save, leave status as pending so the
      // auto-save effect schedules another round.
      if (versionAtSave === versionRef.current) {
        setSaveStatus('saved')
        setSaveError(null)
      } else {
        setSaveStatus('pending')
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
      setSaveStatus('error')
      throw err
    }
  }

  // Debounced auto-save: any edit cancels the previous timer and arms a new one.
  useEffect(() => {
    if (saveStatus !== 'pending') return
    const timer = setTimeout(() => {
      performSave().catch(() => {
        // Error state already captured in performSave.
      })
    }, AUTOSAVE_DELAY_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveStatus, title, bodyJson, bodyText, notebookId, tags, isPinned])

  // Cmd/Ctrl+S — flush save immediately when in edit mode.
  useKeyboardShortcut(
    { key: 's', mod: true },
    async (e) => {
      e.preventDefault()
      if (mode !== 'edit') return
      if (saveStatus === 'saving') return
      if (saveStatus !== 'pending' && saveStatus !== 'error') {
        toast.success('Already saved')
        return
      }
      try {
        await performSave()
        toast.success('Saved')
      } catch {
        // error state captured in performSave; SaveIndicator shows it
      }
    },
    { allowInInputs: true, enabled: mode === 'edit' },
  )

  // Flush pending edits if the editor unmounts (e.g., user clicks another
  // note in the list while a debounced save is still queued). Uses a ref
  // so the cleanup always sees the latest local state.
  const flushRef = useRef({ title, bodyJson, notebookId, tags, isPinned, saveStatus })
  flushRef.current = { title, bodyJson, notebookId, tags, isPinned, saveStatus }
  useEffect(() => {
    return () => {
      const s = flushRef.current
      if (s.saveStatus !== 'pending' && s.saveStatus !== 'error') return
      updateNote.mutate(
        {
          id: noteId,
          title: s.title,
          bodyJson: s.bodyJson,
          notebookId: s.notebookId,
          tags: s.tags,
          isPinned: s.isPinned,
        },
        {
          onError: (err) =>
            toast.error(err instanceof Error ? err.message : 'Failed to save changes'),
        },
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId])

  if (!note.data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  async function handleDone() {
    // Flush any pending or failed save before exiting edit mode so the
    // read view sees the latest content immediately instead of waiting on
    // the debounce timer.
    if (saveStatus === 'pending' || saveStatus === 'error') {
      try {
        await performSave()
      } catch {
        return // stay in edit mode if the flush fails
      }
    }
    setMode('read')
  }

  async function handleRetry() {
    try {
      await performSave()
    } catch {
      // already captured
    }
  }

  async function handleBack() {
    // Flush before unmounting so a pending debounced save isn't lost.
    if (saveStatus === 'pending' || saveStatus === 'error') {
      try {
        await performSave()
      } catch {
        return
      }
    }
    navigate({ to: '/notes', search: (prev) => prev })
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
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={handleBack}
            className="-ml-2 inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-foreground hover:bg-muted md:hidden"
            aria-label="Back to notes"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <span className="ml-auto">Updated {new Date(note.data.updatedAt).toLocaleString()}</span>
          <button
            type="button"
            onClick={handleTogglePin}
            disabled={updateNote.isPending}
            className={`inline-flex items-center gap-1 rounded-md border border-input px-2.5 py-1.5 hover:bg-muted disabled:opacity-50 md:py-1 ${
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
            className="inline-flex items-center gap-1 rounded-md border border-input px-2.5 py-1.5 hover:bg-muted md:py-1"
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
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 hover:text-destructive disabled:opacity-50 md:px-0 md:py-0"
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
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <button
          type="button"
          onClick={handleBack}
          className="-ml-2 inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-foreground hover:bg-muted md:hidden"
          aria-label="Back to notes"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="ml-auto flex items-center gap-3">
          <SaveIndicator status={saveStatus} error={saveError} onRetry={handleRetry} />
          <button
            type="button"
            onClick={handleDone}
            disabled={saveStatus === 'saving'}
            className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 md:py-1"
          >
            Done
          </button>
        </div>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value)
          markDirty()
        }}
        placeholder="Untitled"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Notebook</span>
          <select
            value={notebookId ?? ''}
            onChange={(e) => {
              setNotebookId(e.target.value || null)
              markDirty()
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring md:text-sm"
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
          <TagInput
            tags={tags}
            onChange={(next) => {
              setTags(next)
              markDirty()
            }}
            placeholder="Type a tag, press Enter"
          />
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
          markDirty()
        }}
        placeholder="Start writing…"
      />

      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isPinned}
          onChange={(e) => {
            setIsPinned(e.target.checked)
            markDirty()
          }}
        />
        <span>Pin to top</span>
      </label>
    </div>
  )
}

function SaveIndicator({
  status,
  error,
  onRetry,
}: {
  status: SaveStatus
  error: string | null
  onRetry: () => void
}) {
  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        <span>Saving…</span>
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 text-destructive">
        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{error ?? 'Save failed'}</span>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-input bg-background px-2 py-0.5 text-foreground hover:bg-muted"
        >
          Retry
        </button>
      </span>
    )
  }
  if (status === 'pending') {
    return <span className="text-muted-foreground">Unsaved changes…</span>
  }
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Check className="h-3.5 w-3.5" aria-hidden="true" />
      <span>Saved</span>
    </span>
  )
}
