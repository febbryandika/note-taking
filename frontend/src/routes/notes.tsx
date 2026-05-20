import { useState } from 'react'
import { createFileRoute, Outlet, redirect, useNavigate, useParams } from '@tanstack/react-router'
import { z } from 'zod'
import { NotebookSidebar } from '@/components/notes/NotebookSidebar'
import { NoteList } from '@/components/notes/NoteList'
import { Drawer } from '@/components/ui/Drawer'
import { useToast } from '@/components/ui/Toast'
import { useCreateNote } from '@/hooks/useNotes'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'
import { authClient } from '@/lib/auth-client'

const notesSearchSchema = z.object({
  notebookId: z.string().optional(),
  tag: z.string().optional(),
  edit: z.boolean().optional(),
})

export const Route = createFileRoute('/notes')({
  validateSearch: notesSearchSchema,
  beforeLoad: async () => {
    const { data } = await authClient.getSession()
    if (!data?.session) throw redirect({ to: '/login' })
  },
  component: NotesLayout,
})

function NotesLayout() {
  const navigate = useNavigate()
  const params = useParams({ strict: false })
  const search = Route.useSearch()
  const isOnDetail = Boolean(params.noteId)
  const isDesktop = useIsDesktop()
  const createNote = useCreateNote()
  const toast = useToast()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const closeDrawer = () => setDrawerOpen(false)

  useKeyboardShortcut({ key: 'n', mod: true }, async (e) => {
    e.preventDefault()
    try {
      const created = await createNote.mutateAsync({
        ...(search.notebookId ? { notebookId: search.notebookId } : {}),
        ...(search.tag ? { tags: [search.tag] } : {}),
      })
      navigate({
        to: '/notes/$noteId',
        params: { noteId: created.id },
        search: (prev) => ({ ...prev, edit: true }),
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create note')
    }
  })

  useKeyboardShortcut({ key: 'Escape' }, () => {
    if (drawerOpen) setDrawerOpen(false)
  })

  const sidebarProps = {
    activeNotebookId: search.tag ? null : search.notebookId ?? 'all',
    activeTag: search.tag,
  }

  if (!isDesktop) {
    return (
      <div className="min-h-screen bg-paper font-display text-ink">
        <Drawer open={drawerOpen} onClose={closeDrawer} ariaLabel="Notebooks and tags">
          <div className="flex h-full flex-col bg-paper">
            <NotebookSidebar {...sidebarProps} onNavigate={closeDrawer} />
          </div>
        </Drawer>
        <div className="h-[100dvh] overflow-y-auto">
          {isOnDetail ? <Outlet /> : <NoteList onOpenSidebar={() => setDrawerOpen(true)} />}
        </div>
      </div>
    )
  }

  return (
    <div className="grid h-screen min-h-0 grid-cols-[260px_380px_1fr] bg-paper font-display text-[15px] leading-[1.55] tracking-[-0.005em] text-ink min-[1100px]:grid-cols-[260px_380px_1fr] max-[1100px]:grid-cols-[240px_340px_1fr]">
      <NotebookSidebar {...sidebarProps} />
      <NoteList />
      <section className="flex min-h-0 flex-col bg-paper-surface">
        {isOnDetail ? (
          <Outlet />
        ) : (
          <EmptyEditor />
        )}
      </section>
    </div>
  )
}

function EmptyEditor() {
  return (
    <div className="grid h-full place-items-center px-8 text-center text-ink-faint">
      <div>
        <div className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-2xl bg-paper-soft text-ink-muted">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" />
            <path d="M14 3v6h6" />
          </svg>
        </div>
        <div className="text-[16px] font-semibold text-ink">Pick a note</div>
        <p className="text-[13.5px]">Select a note from the list, or press ⌘N to start a new one.</p>
      </div>
    </div>
  )
}
