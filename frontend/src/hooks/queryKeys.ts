export type NoteFilters = {
  notebookId?: string
  tag?: string
  trashed?: boolean
  pinned?: boolean
}

export const queryKeys = {
  notes: {
    all: ['notes'] as const,
    list: (filters: NoteFilters) => ['notes', 'list', filters] as const,
    detail: (id: string) => ['notes', 'detail', id] as const,
    search: (q: string) => ['notes', 'search', q] as const,
  },
  notebooks: {
    all: ['notebooks'] as const,
  },
  tags: {
    all: ['tags'] as const,
  },
} as const
