import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import {
  useCreateNote,
  useDeleteNote,
  useNotes,
  useSearchNotes,
  useTogglePin,
  type Note,
} from '@/hooks/useNotes'
import { useNotebooks } from '@/hooks/useNotebooks'
import { QueryError } from '@/components/ui/QueryError'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

const SEARCH_DEBOUNCE_MS = 250

export function NoteList({ onOpenSidebar }: { onOpenSidebar?: () => void }) {
  const navigate = useNavigate()
  const search = useSearch({ from: '/notes' })
  const params = useParams({ strict: false }) as { noteId?: string }
  const activeNoteId = params.noteId
  const notebooks = useNotebooks()
  const notebookName = (id: string | null) =>
    id ? notebooks.data?.find((n) => n.id === id)?.name : undefined

  const [searchInput, setSearchInput] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchInput.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [searchInput])
  const isSearching = debouncedQuery.length > 0

  const notes = useNotes(
    isSearching
      ? {}
      : {
          ...(search.notebookId ? { notebookId: search.notebookId } : {}),
          ...(search.tag ? { tag: search.tag } : {}),
        },
  )
  const searchResults = useSearchNotes(debouncedQuery)

  const activeData = isSearching ? searchResults.data : notes.data
  const activeLoading = isSearching ? searchResults.isLoading : notes.isLoading
  const activeQuery = isSearching ? searchResults : notes

  function clearSearch() {
    setSearchInput('')
    setDebouncedQuery('')
  }

  const createNote = useCreateNote()
  const togglePin = useTogglePin()
  const deleteNote = useDeleteNote()
  const toast = useToast()

  async function handleNewNote() {
    clearSearch()
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

  const titleText = isSearching
    ? 'Search results'
    : search.tag
      ? `#${search.tag}`
      : search.notebookId
        ? notebookName(search.notebookId) ?? 'Notebook'
        : 'All notes'

  return (
    <section className="flex min-h-0 flex-col border-r border-paper-line">
      <header className="flex flex-col gap-3.5 px-5 pb-3 pt-5">
        <div className="flex items-baseline gap-2">
          {onOpenSidebar && (
            <button
              type="button"
              onClick={onOpenSidebar}
              className="grid h-7 w-7 place-items-center rounded-md text-ink-muted hover:bg-paper-soft hover:text-ink"
              aria-label="Open menu"
            >
              <MenuIcon />
            </button>
          )}
          <h2 className="m-0 text-[22px] font-semibold tracking-[-0.02em] text-ink">{titleText}</h2>
          <span className="ml-auto text-[13px] font-medium tabular-nums text-ink-faint">
            {activeData?.length ?? 0}
          </span>
        </div>

        <SearchBox value={searchInput} onChange={setSearchInput} onClear={clearSearch} />

        <div className="flex items-center gap-1.5 text-[12.5px] text-ink-faint">
          <span>Sorted by</span>
          <span className="font-medium text-ink">recent</span>
          <button
            type="button"
            onClick={handleNewNote}
            disabled={createNote.isPending}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] font-medium text-ink-muted transition-colors hover:bg-paper-soft hover:text-ink disabled:opacity-50"
            title="New note (⌘N)"
          >
            <PlusIcon />
            New
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3.5 pb-6 pt-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-paper-line">
        {isSearching && !searchResults.isLoading && (
          <p className="px-2 pb-1 text-[11.5px] text-ink-faint">
            {searchResults.data?.length ?? 0} result
            {searchResults.data?.length === 1 ? '' : 's'} for{' '}
            <span className="font-medium text-ink">&quot;{debouncedQuery}&quot;</span>
          </p>
        )}

        {activeQuery.isError && !activeQuery.data ? (
          <div className="px-2">
            <QueryError
              message={isSearching ? 'Search failed.' : "Couldn't load your notes."}
              onRetry={() => activeQuery.refetch()}
              isRetrying={activeQuery.isFetching}
            />
          </div>
        ) : activeLoading ? (
          <ul className="flex flex-col gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="space-y-1.5 rounded-[10px] border border-paper-line bg-paper-surface p-3.5">
                <Skeleton className="h-4 w-3/4 bg-paper-soft" />
                <Skeleton className="h-3 w-full bg-paper-soft" />
                <Skeleton className="h-3 w-2/3 bg-paper-soft" />
              </li>
            ))}
          </ul>
        ) : activeData && activeData.length > 0 ? (
          (() => {
            const pinned = isSearching ? [] : activeData.filter((n) => n.isPinned)
            const others = isSearching ? activeData : activeData.filter((n) => !n.isPinned)

            const renderItem = (n: Note) => (
              <NoteRow
                key={n.id}
                note={n}
                notebookName={notebookName(n.notebookId)}
                active={activeNoteId === n.id}
                onTogglePin={() => togglePin(n.id, !n.isPinned)}
                onTrash={() => handleTrash(n.id, n.title)}
                onTagClick={(tag) => navigate({ to: '/notes', search: { tag } })}
                deleting={deleteNote.isPending}
              />
            )

            return (
              <>
                {pinned.length > 0 && (
                  <>
                    <div className="flex items-center gap-1.5 px-2 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                      <span className="text-rating">
                        <PinnedStar />
                      </span>
                      Pinned
                    </div>
                    {pinned.map(renderItem)}
                  </>
                )}
                {others.length > 0 && pinned.length > 0 && (
                  <div className="px-2 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                    Others
                  </div>
                )}
                {others.map(renderItem)}
              </>
            )
          })()
        ) : isSearching ? (
          <EmptyState
            title="No matches"
            body={
              <>
                Try a different query, or{' '}
                <button type="button" onClick={clearSearch} className="font-medium text-ink underline-offset-2 hover:underline">
                  clear search
                </button>
                .
              </>
            }
          />
        ) : (
          <EmptyState title="No notes yet" body={<>Click <span className="font-medium text-ink">New</span> to create one.</>} />
        )}
      </div>
    </section>
  )
}

function NoteRow({
  note,
  notebookName,
  active,
  onTogglePin,
  onTrash,
  onTagClick,
  deleting,
}: {
  note: Note
  notebookName: string | undefined
  active: boolean
  onTogglePin: () => void
  onTrash: () => void
  onTagClick: (tag: string) => void
  deleting: boolean
}) {
  return (
    <div className="group relative">
      <Link
        to="/notes/$noteId"
        params={{ noteId: note.id }}
        search={(prev) => prev}
        className={
          active
            ? "relative block cursor-pointer rounded-[10px] border border-paper-line bg-paper-surface px-4 py-3.5 shadow-paper-sm before:absolute before:-left-[14px] before:top-3.5 before:bottom-3.5 before:w-[3px] before:rounded-r-[3px] before:bg-iris before:content-['']"
            : 'block cursor-pointer rounded-[10px] border border-transparent px-4 py-3.5 transition-colors hover:bg-paper-soft'
        }
      >
        <div className="mb-1 flex items-center gap-1">
          <div className="flex-1 truncate text-[14.5px] font-semibold tracking-[-0.008em] text-ink">
            {note.title || 'Untitled'}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onTrash()
            }}
            disabled={deleting}
            className="hidden shrink-0 rounded p-1 text-ink-faint transition-colors hover:text-red-600 disabled:opacity-50 group-hover:block"
            aria-label="Move to trash"
            title="Move to trash"
          >
            <SmallTrashIcon />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onTogglePin()
            }}
            className={`shrink-0 rounded p-1 ${note.isPinned ? 'text-rating' : 'text-ink-faint hover:text-rating'}`}
            aria-label={note.isPinned ? 'Unpin' : 'Pin'}
            aria-pressed={note.isPinned}
            title={note.isPinned ? 'Unpin' : 'Pin'}
          >
            <PinnedStar filled={note.isPinned} />
          </button>
        </div>
        {note.bodyText && (
          <p className="line-clamp-2 text-[13px] leading-[1.5] text-ink-muted [text-wrap:pretty]">
            {note.bodyText.slice(0, 200)}
          </p>
        )}
        <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-ink-faint">
          {notebookName && (
            <span className={`rounded-full px-[7px] py-px font-medium ${active ? 'bg-paper-softer text-ink-muted' : 'bg-paper-soft text-ink-muted'}`}>
              {notebookName}
            </span>
          )}
          {note.tags.slice(0, 2).map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onTagClick(tag)
              }}
              className={`rounded-full px-[7px] py-px font-medium ${active ? 'bg-paper-softer text-ink-muted' : 'bg-paper-soft text-ink-muted'} hover:text-ink`}
            >
              #{tag}
            </button>
          ))}
          <span className="ml-auto">{new Date(note.updatedAt).toLocaleDateString()}</span>
        </div>
      </Link>
    </div>
  )
}

function SearchBox({
  value,
  onChange,
  onClear,
}: {
  value: string
  onChange: (v: string) => void
  onClear: () => void
}) {
  return (
    <div className="relative flex items-center">
      <svg
        className="pointer-events-none absolute left-3 text-ink-faint"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && value) {
            e.preventDefault()
            onClear()
          }
        }}
        placeholder="Search notes…"
        aria-label="Search notes"
        className="w-full rounded-[9px] border border-transparent bg-paper-soft py-2.5 pl-9 pr-10 text-[14px] text-ink placeholder:text-ink-faint focus:border-iris focus:bg-paper-surface focus:outline-none focus:ring-4 focus:ring-iris-soft"
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2.5 rounded p-1 text-ink-faint transition-colors hover:bg-paper-surface hover:text-ink"
          aria-label="Clear search"
          title="Clear search (Esc)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      ) : (
        <span className="pointer-events-none absolute right-2.5 inline-flex h-[18px] items-center rounded border border-paper-line bg-paper-softer px-1.5 text-[11px] font-medium text-ink-muted">
          ⌘K
        </span>
      )}
    </div>
  )
}

function EmptyState({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <div className="grid h-full place-items-center text-center text-ink-faint">
      <div>
        <div className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-2xl bg-paper-soft text-ink-muted">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" />
            <path d="M14 3v6h6" />
          </svg>
        </div>
        <div className="text-[16px] font-semibold text-ink">{title}</div>
        <p className="text-[13.5px]">{body}</p>
      </div>
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

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

function PinnedStar({ filled = true }: { filled?: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3 2.6 5.4 6 .9-4.3 4.2 1 6L12 16.7l-5.3 2.8 1-6L3.4 9.3l6-.9L12 3Z" />
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
