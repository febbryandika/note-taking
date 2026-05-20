import { useState } from 'react'
import { Link, useNavigate, useRouter, useRouterState } from '@tanstack/react-router'
import {
  useCreateNotebook,
  useDeleteNotebook,
  useNotebooks,
  useRenameNotebook,
} from '@/hooks/useNotebooks'
import { useNotes, useCreateNote } from '@/hooks/useNotes'
import { useTags } from '@/hooks/useTags'
import { QueryError } from '@/components/ui/QueryError'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { signOut, useSession } from '@/lib/auth-client'
import { NotebookFormModal } from './NotebookFormModal'
import { ConfirmModal } from './ConfirmModal'

type Notebook = { id: string; name: string }

export function NotebookSidebar({
  activeNotebookId,
  activeTag,
  onNavigate,
}: {
  activeNotebookId?: string | 'all' | null
  activeTag?: string
  onNavigate?: () => void
}) {
  const router = useRouter()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const onTrashPage = pathname === '/trash'
  const notebooks = useNotebooks()
  const allNotes = useNotes({})
  const tags = useTags()
  const createNote = useCreateNote()
  const createNotebook = useCreateNotebook()
  const renameNotebook = useRenameNotebook()
  const deleteNotebook = useDeleteNotebook()
  const toast = useToast()
  const { data: session } = useSession()

  const [createOpen, setCreateOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<Notebook | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Notebook | null>(null)

  const existingNames = notebooks.data?.map((nb) => nb.name) ?? []
  const totalCount = allNotes.data?.length ?? 0
  const notebookCounts = new Map<string, number>()
  for (const n of allNotes.data ?? []) {
    if (n.notebookId) notebookCounts.set(n.notebookId, (notebookCounts.get(n.notebookId) ?? 0) + 1)
  }

  async function handleNewNote() {
    try {
      const created = await createNote.mutateAsync({})
      onNavigate?.()
      navigate({
        to: '/notes/$noteId',
        params: { noteId: created.id },
        search: (prev) => ({ ...prev, edit: true }),
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create note')
    }
  }

  async function handleCreate(name: string) {
    try {
      await createNotebook.mutateAsync(name)
      toast.success(`Notebook "${name}" created`)
      setCreateOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create notebook')
    }
  }

  async function handleRename(name: string) {
    if (!renameTarget) return
    try {
      await renameNotebook.mutateAsync({ id: renameTarget.id, name })
      toast.success('Notebook renamed')
      setRenameTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to rename notebook')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const target = deleteTarget
    try {
      await deleteNotebook.mutateAsync(target.id)
      toast.success(`Notebook "${target.name}" deleted`)
      setDeleteTarget(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete notebook'
      if (message === 'Notebook has notes') {
        toast.error('Cannot delete — move or trash the notes inside first.')
      } else {
        toast.error(message)
      }
      setDeleteTarget(null)
    }
  }

  async function handleSignOut() {
    await signOut()
    router.navigate({ to: '/' })
  }

  const userName = session?.user?.name ?? session?.user?.email ?? 'You'
  const userEmail = session?.user?.email ?? ''
  const initials = (session?.user?.name ?? session?.user?.email ?? 'Y')
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || 'Y'

  return (
    <aside className="flex min-h-0 flex-col border-r border-paper-line bg-paper px-3.5 pt-5">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-2 [margin-right:-8px] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-paper-line">
        <Link to="/" onClick={onNavigate} className="flex items-center gap-2.5 px-2 pt-1">
          <div className="grid h-8 w-8 place-items-center rounded-[9px] bg-ink text-[14px] font-bold tracking-[-0.02em] text-paper">
            N
          </div>
          <div className="text-[17px] font-semibold tracking-[-0.015em] text-ink">Notable</div>
        </Link>

        <button
          type="button"
          onClick={handleNewNote}
          disabled={createNote.isPending}
          className="flex items-center gap-2.5 rounded-[10px] bg-iris px-3.5 py-3 text-[14px] font-semibold tracking-[-0.005em] text-white shadow-paper-sm transition hover:brightness-105 active:translate-y-px disabled:opacity-60"
        >
          <PlusIcon />
          <span>New note</span>
          <span className="ml-auto rounded border-0 bg-white/20 px-1.5 py-px text-[11px] font-medium text-white/95">
            ⌘ N
          </span>
        </button>

        <Section label="Library">
          <NavRow
            label="All notes"
            icon={<InboxIcon />}
            count={totalCount}
            active={!onTrashPage && activeNotebookId === 'all' && !activeTag}
            to="/notes"
            search={{}}
            onClick={onNavigate}
          />
          <NavRow
            label="Trash"
            icon={<TrashIcon />}
            active={onTrashPage}
            to="/trash"
            onClick={onNavigate}
          />
        </Section>

        <Section
          label="Notebooks"
          action={
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              disabled={createNotebook.isPending}
              className="grid h-5 w-5 place-items-center rounded-md text-ink-faint transition-colors hover:bg-paper-soft hover:text-ink disabled:opacity-50"
              aria-label="New notebook"
              title="New notebook"
            >
              <PlusIcon size={12} />
            </button>
          }
        >
          {notebooks.isError && !notebooks.data ? (
            <div className="px-2 pt-1">
              <QueryError
                compact
                message="Couldn't load notebooks."
                onRetry={() => notebooks.refetch()}
                isRetrying={notebooks.isFetching}
              />
            </div>
          ) : notebooks.isLoading ? (
            <div className="space-y-1 px-2 pt-1" aria-hidden="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : notebooks.data && notebooks.data.length === 0 ? (
            <p className="px-2 text-[12.5px] italic text-ink-faint">
              No notebooks yet — click + to create one.
            </p>
          ) : (
            notebooks.data?.map((nb) => {
              const active = activeNotebookId === nb.id
              return (
                <div key={nb.id} className="group relative">
                  <NavRow
                    label={nb.name}
                    icon={<BookIcon />}
                    count={notebookCounts.get(nb.id) ?? 0}
                    active={active}
                    to="/notes"
                    search={{ notebookId: nb.id }}
                    onClick={onNavigate}
                    hideCountOnGroupHover
                  />
                  <div className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 group-hover:flex">
                    <button
                      type="button"
                      onClick={() => setRenameTarget(nb)}
                      className="grid h-6 w-6 place-items-center rounded text-ink-faint transition-colors hover:bg-paper-surface hover:text-ink"
                      aria-label="Rename notebook"
                      title="Rename notebook"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(nb)}
                      className="grid h-6 w-6 place-items-center rounded text-ink-faint transition-colors hover:bg-paper-surface hover:text-red-600"
                      aria-label="Delete notebook"
                      title="Delete notebook"
                    >
                      <XIcon />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </Section>

        {tags.data && tags.data.length > 0 && (
          <Section label="Tags">
            <div className="flex flex-wrap gap-1.5 px-1.5">
              {tags.data.map(({ tag, count }) => {
                const active = activeTag === tag
                return (
                  <Link
                    key={tag}
                    to="/notes"
                    search={{ tag }}
                    onClick={onNavigate}
                    className={
                      active
                        ? 'inline-flex items-center gap-1 rounded-full border border-iris bg-iris-soft px-2.5 py-1 text-[12.5px] font-medium text-iris-deep'
                        : 'inline-flex items-center gap-1 rounded-full border border-transparent bg-paper-soft px-2.5 py-1 text-[12.5px] font-medium text-ink-muted transition-colors hover:bg-paper-softer hover:text-ink'
                    }
                  >
                    <span>#{tag}</span>
                    <span className="text-[11px] text-ink-faint">{count}</span>
                  </Link>
                )
              })}
            </div>
          </Section>
        )}
      </div>

      <div className="flex flex-shrink-0 items-center gap-2.5 border-t border-paper-line px-2 py-3">
        <div className="grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-iris to-iris-deep text-[12.5px] font-semibold text-white">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-ink">{userName}</div>
          {userEmail && userEmail !== userName && (
            <div className="truncate text-[11.5px] text-ink-faint">{userEmail}</div>
          )}
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          title="Sign out"
          aria-label="Sign out"
          className="grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-md text-ink-faint transition-colors hover:bg-paper-soft hover:text-red-600"
        >
          <LogoutIcon />
        </button>
      </div>

      <NotebookFormModal
        open={createOpen}
        mode="create"
        existingNames={existingNames}
        isPending={createNotebook.isPending}
        onSubmit={handleCreate}
        onClose={() => setCreateOpen(false)}
      />

      <NotebookFormModal
        open={renameTarget !== null}
        mode="rename"
        initialName={renameTarget?.name ?? ''}
        existingNames={existingNames}
        isPending={renameNotebook.isPending}
        onSubmit={handleRename}
        onClose={() => setRenameTarget(null)}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete notebook?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" will be permanently removed. Notes inside must be moved or trashed first.`
            : ''
        }
        confirmLabel="Delete"
        destructive
        isPending={deleteNotebook.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </aside>
  )
}

function Section({
  label,
  action,
  children,
}: {
  label: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
        <span>{label}</span>
        {action}
      </div>
      <div className="flex flex-col gap-px">{children}</div>
    </div>
  )
}

function NavRow({
  label,
  icon,
  count,
  active,
  to,
  search,
  onClick,
  hideCountOnGroupHover,
}: {
  label: string
  icon: React.ReactNode
  count?: number
  active?: boolean
  to: string
  search?: Record<string, unknown>
  onClick?: () => void
  hideCountOnGroupHover?: boolean
}) {
  const className = active
    ? "relative flex items-center gap-2.5 rounded-lg bg-iris-soft px-2.5 py-2 text-[14px] font-semibold tracking-[-0.005em] text-ink before:absolute before:left-[-14px] before:top-2 before:bottom-2 before:w-[3px] before:rounded-r-[3px] before:bg-iris before:content-['']"
    : 'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] font-medium tracking-[-0.005em] text-ink-muted transition-colors hover:bg-paper-soft hover:text-ink'
  return (
    <Link
      // @ts-expect-error TanStack Router strict typing for dynamic `to` doesn't quite fit
      to={to}
      // @ts-expect-error same as above
      search={search ?? {}}
      onClick={onClick}
      className={className}
    >
      <span className="grid h-4 w-4 place-items-center text-current">{icon}</span>
      <span className="truncate">{label}</span>
      {count !== undefined && (
        <span
          className={`ml-auto text-[12px] font-medium tabular-nums ${active ? 'text-iris-deep' : 'text-ink-faint'} ${hideCountOnGroupHover ? 'group-hover:invisible' : ''}`}
        >
          {count}
        </span>
      )}
    </Link>
  )
}

function PlusIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

function InboxIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}
