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
      <>
        <Drawer open={drawerOpen} onClose={closeDrawer} ariaLabel="Notebooks and tags">
          <NotebookSidebar {...sidebarProps} onNavigate={closeDrawer} />
        </Drawer>
        <div className="h-[calc(100dvh-7rem)] overflow-y-auto">
          {isOnDetail ? <Outlet /> : <NoteList onOpenSidebar={() => setDrawerOpen(true)} />}
        </div>
      </>
    )
  }

  return (
    <div
      className={`grid h-[calc(100vh-8rem)] gap-4 ${
        isOnDetail ? 'grid-cols-[220px_320px_1fr]' : 'grid-cols-[220px_1fr]'
      }`}
    >
      <aside className="overflow-y-auto border-r border-border pr-2">
        <NotebookSidebar {...sidebarProps} />
      </aside>
      <section
        className={`overflow-y-auto ${isOnDetail ? 'border-r border-border pr-2' : ''}`}
      >
        <NoteList />
      </section>
      {isOnDetail && (
        <section className="overflow-y-auto px-2">
          <Outlet />
        </section>
      )}
    </div>
  )
}
