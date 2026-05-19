import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { FileText, Menu, Plus, Star, Trash2 } from 'lucide-react'
import {
  useCreateNote,
  useDeleteNote,
  useNotes,
  useSearchNotes,
  useTogglePin,
  type Note,
} from '@/hooks/useNotes'
import { Kbd } from '@/components/ui/Kbd'
import { QueryError } from '@/components/ui/QueryError'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { SearchBar } from './SearchBar'

const SEARCH_DEBOUNCE_MS = 250

export function NoteList({ onOpenSidebar }: { onOpenSidebar?: () => void }) {
  const navigate = useNavigate()
  const search = useSearch({ from: '/notes' })
  const params = useParams({ strict: false }) as { noteId?: string }
  const activeNoteId = params.noteId

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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {onOpenSidebar && (
          <button
            type="button"
            onClick={onOpenSidebar}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <h2 className="flex-1 text-sm font-medium text-muted-foreground">
          {isSearching ? 'Search results' : 'Notes'}
        </h2>
        <button
          type="button"
          onClick={handleNewNote}
          disabled={createNote.isPending}
          className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50 md:px-2 md:py-1 md:text-xs"
          aria-label="New note"
          title="New note"
        >
          <Plus className="h-4 w-4 md:h-3.5 md:w-3.5" />
          New
          <Kbd combo="mod+n" className="ml-0.5" />
        </button>
      </div>

      <SearchBar value={searchInput} onChange={setSearchInput} onClear={clearSearch} />

      {isSearching && !searchResults.isLoading && (
        <p className="text-[11px] text-muted-foreground">
          {searchResults.data?.length ?? 0} result
          {searchResults.data?.length === 1 ? '' : 's'} for{' '}
          <span className="font-medium text-foreground">"{debouncedQuery}"</span>
        </p>
      )}

      {activeQuery.isError && !activeQuery.data ? (
        <QueryError
          message={isSearching ? 'Search failed.' : 'Couldn’t load your notes.'}
          onRetry={() => activeQuery.refetch()}
          isRetrying={activeQuery.isFetching}
        />
      ) : activeLoading ? (
        <ul className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="space-y-1.5 rounded-md border border-border p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </li>
          ))}
        </ul>
      ) : activeData && activeData.length > 0 ? (
        (() => {
          const pinned = isSearching ? [] : activeData.filter((n) => n.isPinned)
          const others = isSearching ? activeData : activeData.filter((n) => !n.isPinned)
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
                  className={`-m-1 mt-0 shrink-0 p-1 ${
                    n.isPinned ? 'text-yellow-500' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-label={n.isPinned ? 'Unpin' : 'Pin'}
                  aria-pressed={n.isPinned}
                  title={n.isPinned ? 'Unpin' : 'Pin'}
                >
                  <Star className="h-4 w-4 md:h-3.5 md:w-3.5" fill={n.isPinned ? 'currentColor' : 'none'} />
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
                        className="rounded-full bg-muted px-2 py-0.5 text-foreground/70 hover:bg-muted/70 hover:text-foreground"
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
                  className="-m-1 mt-0 shrink-0 p-1 text-muted-foreground transition-opacity hover:text-destructive disabled:opacity-50 md:opacity-0 md:group-hover:opacity-100"
                  aria-label="Move to trash"
                  title="Move to trash"
                >
                  <Trash2 className="h-4 w-4 md:h-3.5 md:w-3.5" />
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
      ) : isSearching ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border py-12 text-center">
          <FileText className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm font-medium">No matches</p>
          <p className="text-xs text-muted-foreground">
            Try a different query, or{' '}
            <button
              type="button"
              onClick={clearSearch}
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              clear search
            </button>
            .
          </p>
        </div>
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
