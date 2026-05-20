import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
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
  const versionRef = useRef(0)

  useEffect(() => {
    if (!note.data) return
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

  useEffect(() => {
    if (saveStatus !== 'pending') return
    const timer = setTimeout(() => {
      performSave().catch(() => {})
    }, AUTOSAVE_DELAY_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveStatus, title, bodyJson, bodyText, notebookId, tags, isPinned])

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
        // captured
      }
    },
    { allowInInputs: true, enabled: mode === 'edit' },
  )

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
      <div className="mx-auto max-w-[720px] space-y-4 px-8 py-12">
        <Skeleton className="h-8 w-2/3 bg-paper-soft" />
        <Skeleton className="h-4 w-full bg-paper-soft" />
        <Skeleton className="h-64 w-full bg-paper-soft" />
      </div>
    )
  }

  async function handleDone() {
    if (saveStatus === 'pending' || saveStatus === 'error') {
      try {
        await performSave()
      } catch {
        return
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

  const notebook = notebooks.data?.find((nb) => nb.id === note.data.notebookId)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2.5 border-b border-paper-line bg-paper-surface px-7 py-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden whitespace-nowrap text-[13px] text-ink-faint">
          {notebook && (
            <>
              <span className="text-ink-muted">{notebook.name}</span>
              <span className="opacity-50">/</span>
            </>
          )}
          <span className="min-w-0 flex-1 truncate font-medium text-ink-muted">
            {note.data.title || 'Untitled'}
          </span>
        </div>
        <SavePill status={saveStatus} error={saveError} onRetry={handleRetry} />
        <ToolButton
          onClick={handleTogglePin}
          disabled={updateNote.isPending}
          active={note.data.isPinned}
          aria-label={note.data.isPinned ? 'Unpin' : 'Pin'}
          title={note.data.isPinned ? 'Unpin' : 'Pin'}
        >
          <PinIcon filled={note.data.isPinned} />
          <span>{note.data.isPinned ? 'Pinned' : 'Pin'}</span>
        </ToolButton>
        {mode === 'edit' ? (
          <button
            type="button"
            onClick={handleDone}
            disabled={saveStatus === 'saving'}
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-[13px] font-medium text-paper transition hover:brightness-110 disabled:opacity-60"
          >
            Done
          </button>
        ) : (
          <ToolButton onClick={() => setMode('edit')} aria-label="Edit" title="Edit">
            <PencilIcon />
            <span>Edit</span>
          </ToolButton>
        )}
        <ToolButton onClick={handleTrash} disabled={deleteNote.isPending} danger aria-label="Move to trash" title="Move to trash">
          <SmallTrashIcon />
          <span>Trash</span>
        </ToolButton>
      </header>

      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-paper-line">
        <div className="mx-auto max-w-[720px] px-7 pb-24 pt-12">
          {mode === 'edit' ? (
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                markDirty()
              }}
              placeholder="Untitled"
              className="m-0 mb-2 w-full border-none bg-transparent p-0 text-[38px] font-bold leading-[1.15] tracking-[-0.025em] text-ink outline-none placeholder:text-ink-faint"
            />
          ) : (
            <h1 className="mb-2 text-[38px] font-bold leading-[1.15] tracking-[-0.025em] text-ink">
              {note.data.title || 'Untitled'}
            </h1>
          )}

          <div className="mb-6 text-[13.5px] text-ink-faint">
            Updated {new Date(note.data.updatedAt).toLocaleString()}
          </div>

          {mode === 'edit' ? (
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-[13px]">
                <span className="text-ink-muted">Notebook</span>
                <select
                  value={notebookId ?? ''}
                  onChange={(e) => {
                    setNotebookId(e.target.value || null)
                    markDirty()
                  }}
                  className="w-full rounded-[10px] border border-paper-line-strong bg-paper-surface px-3 py-2 text-[14px] text-ink outline-none focus:border-iris focus:ring-4 focus:ring-iris-soft"
                >
                  <option value="">No notebook</option>
                  {notebooks.data?.map((nb) => (
                    <option key={nb.id} value={nb.id}>
                      {nb.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-col gap-1 text-[13px] sm:col-span-2">
                <span className="text-ink-muted">Tags</span>
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
          ) : (
            (notebook || note.data.tags.length > 0) && (
              <div className="mb-6 flex flex-wrap gap-2 text-[12px]">
                {notebook && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-iris-soft px-2.5 py-1 font-medium text-iris-deep">
                    {notebook.name}
                  </span>
                )}
                {note.data.tags.map((tag) => (
                  <Link
                    key={tag}
                    to="/notes"
                    search={{ tag }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-paper-soft px-2.5 py-1 font-medium text-ink-muted before:text-ink-faint before:content-['#'] hover:text-ink"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )
          )}

          {mode === 'edit' ? (
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
          ) : note.data.bodyText || (note.data.bodyJson && note.data.bodyJson !== '{}') ? (
            <TipTapEditor
              key={`read-${note.data.id}-${note.data.updatedAt}`}
              bodyJson={note.data.bodyJson}
              bodyText={note.data.bodyText}
              editable={false}
            />
          ) : (
            <p className="text-[14px] italic text-ink-faint">
              No content yet — click Edit to start writing.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function ToolButton({
  children,
  active,
  danger,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-50 ${
        active
          ? 'bg-paper-soft text-rating'
          : danger
            ? 'text-ink-muted hover:bg-paper-soft hover:text-red-600'
            : 'text-ink-muted hover:bg-paper-soft hover:text-ink'
      }`}
      {...rest}
    >
      {children}
    </button>
  )
}

function SavePill({
  status,
  error,
  onRetry,
}: {
  status: SaveStatus
  error: string | null
  onRetry: () => void
}) {
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] text-red-600">
        <AlertIcon />
        <span className="hidden sm:inline">{error ?? 'Save failed'}</span>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-paper-line-strong bg-paper-surface px-1.5 py-px text-ink transition hover:bg-paper-soft"
        >
          Retry
        </button>
      </span>
    )
  }
  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] text-ink-faint">
        <Spinner />
        Saving…
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] text-ink-faint">
        Editing…
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] text-ink-faint">
      <span className="text-iris">
        <CheckIcon />
      </span>
      Saved
    </span>
  )
}

function PinIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3 2.6 5.4 6 .9-4.3 4.2 1 6L12 16.7l-5.3 2.8 1-6L3.4 9.3l6-.9L12 3Z" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  )
}

function SmallTrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 5 5L20 7" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
