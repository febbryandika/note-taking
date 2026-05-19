# Technical Specification – Note-taking App

## 1. Overview

A personal note-taking app where authenticated users write rich-text notes, organize them into notebooks, tag them, and search across everything.

### Core Features
- User authentication via better-auth
- Rich-text note editor (TipTap) with auto-save (debounced)
- Organize notes into notebooks
- Tags per note with a tag cloud sidebar
- Full-text search across title + content (PostgreSQL `tsvector`)
- Pin notes to top of list
- Soft delete (trash) with restore + permanent delete

### Tech Stack
- **Frontend:** React 19 · Vite · TanStack Router · TanStack Query · TailwindCSS · TipTap
- **Backend:** Hono · Bun · better-auth
- **Database:** Neon PostgreSQL · Drizzle ORM · drizzle-kit
- **Shared:** Zod (validation) · Hono RPC client (end-to-end types)

---

## 2. Project Structure

```
note-taking-app/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Hono app entry point — exports AppType
│   │   ├── routes/
│   │   │   ├── notes.ts
│   │   │   └── notebooks.ts
│   │   ├── db/
│   │   │   ├── schema.ts     # Drizzle table definitions
│   │   │   └── index.ts      # Neon + Drizzle client
│   │   └── lib/
│   │       ├── auth.ts       # better-auth config
│   │       └── middleware.ts # requireAuth middleware
│   ├── drizzle.config.ts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── routes/           # TanStack Router file-based routes
│   │   ├── components/
│   │   ├── hooks/            # TanStack Query hooks
│   │   └── lib/
│   │       ├── client.ts     # hc<AppType> — typed Hono RPC client
│   │       └── auth-client.ts
│   └── package.json
└── package.json              # Bun workspaces
```

---

## 3. Functional Requirements

### 3.1 Authentication
- Email + password register / login / logout via better-auth
- All routes except `/login` and `/register` require a valid session
- Session stored in HttpOnly cookie

### 3.2 Notes
- **Create:** title (defaults to "Untitled"), TipTap rich-text body, notebookId (optional), tags (string array), isPinned
- **Edit:** all fields; body auto-saves 1 second after last keystroke (debounced PUT)
- **Pin:** toggle via star icon; pinned notes always sort first
- **Trash:** soft delete — sets `trashedAt`; trashed notes hidden from main list
- **Restore:** clears `trashedAt`
- **Permanent delete:** hard delete, only available from trash view

### 3.3 Notebooks
- Create / rename / delete notebooks
- Delete blocked if notebook contains non-trashed notes (enforce in API)
- "All Notes" is a virtual view (no notebookId filter)

### 3.4 Tags
- Stored as `text[]` on the note row (PostgreSQL array)
- Sidebar shows all unique tags + count
- Click a tag to filter the note list

### 3.5 Search
- PostgreSQL `tsvector` generated column on `title || body_text`
- Query via `to_tsquery`, sort by `ts_rank`
- Returns notes where `trashed_at IS NULL`

---

## 4. Data Model (Drizzle Schema)

```typescript
// backend/src/db/schema.ts
import { pgTable, text, boolean, timestamp, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'

export const notebooks = pgTable('notebooks', {
  id:        text('id').primaryKey().$defaultFn(() => createId()),
  userId:    text('user_id').notNull(),
  name:      text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('idx_notebook_user').on(t.userId),
])

export const notes = pgTable('notes', {
  id:         text('id').primaryKey().$defaultFn(() => createId()),
  userId:     text('user_id').notNull(),
  notebookId: text('notebook_id').references(() => notebooks.id, { onDelete: 'set null' }),
  title:      text('title').notNull().default('Untitled'),
  bodyJson:   text('body_json').notNull().default('{}'),
  bodyText:   text('body_text').notNull().default(''),
  tags:       text('tags').array().notNull().default(sql`'{}'::text[]`),
  isPinned:   boolean('is_pinned').notNull().default(false),
  trashedAt:  timestamp('trashed_at', { withTimezone: true }),
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('idx_note_user').on(t.userId),
  index('idx_note_notebook').on(t.notebookId),
])
```

**Full-text search index** — add via a Drizzle migration raw SQL file:
```sql
ALTER TABLE notes ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body_text,''))
  ) STORED;

CREATE INDEX idx_note_fts ON notes USING GIN(fts);
```

---

## 5. API Design

All routes prefixed with `/api`, protected by `requireAuth` middleware.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notes` | List notes (`notebookId?`, `tag?`, `trashed?`, `pinned?`) |
| POST | `/api/notes` | Create note |
| GET | `/api/notes/:id` | Get single note |
| PUT | `/api/notes/:id` | Update note |
| DELETE | `/api/notes/:id` | Soft delete (set trashedAt) |
| POST | `/api/notes/:id/restore` | Restore from trash |
| DELETE | `/api/notes/:id/permanent` | Permanent delete |
| GET | `/api/notes/search` | FTS search (`q` query param) |
| GET | `/api/notebooks` | List notebooks |
| POST | `/api/notebooks` | Create notebook |
| PUT | `/api/notebooks/:id` | Rename notebook |
| DELETE | `/api/notebooks/:id` | Delete notebook |
| GET | `/api/tags` | All unique tags with counts |

**Hono RPC client (frontend):**
```typescript
// frontend/src/lib/client.ts
import { hc } from 'hono/client'
import type { AppType } from '../../backend/src/index'
export const client = hc<AppType>('http://localhost:3001')
```

---

## 6. Frontend Routes & Key Components

```
/login           — login form
/register        — register form
/notes           — three-panel layout (sidebar + list + editor)
/notes/$noteId   — opens note in editor (URL reflects active note)
/trash           — trashed notes list
```

**Three-panel layout:**
- **Left panel:** `NotebookSidebar` — notebook list, tag cloud, trash link
- **Center panel:** `NoteList` — sorted pinned-first, then `updatedAt` DESC; includes `SearchBar`
- **Right panel:** `NoteEditor` — TipTap; debounced auto-save via `useUpdateNote` mutation

**Key components:**
- `NoteCard` — title snippet, tags, updatedAt timestamp, pin/trash actions
- `NoteEditor` — TipTap with `useEditor`; calls mutation on `onUpdate` (debounced 1000ms)
- `TagCloud` — all user tags with count badge, click to filter list
- `SearchBar` — calls `/api/notes/search`, results replace the note list temporarily

**TanStack Query pattern:**
```typescript
export function useNotes(filters: NoteFilters) {
  return useQuery({
    queryKey: ['notes', filters],
    queryFn: () => client.api.notes.$get({ query: filters }).then(r => r.json()),
  })
}

export function useUpdateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateInput) =>
      client.api.notes[':id'].$put({ param: { id }, json: body }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })
}
```

---

## 7. Auth Configuration

```typescript
// backend/src/lib/auth.ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '../db'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
})

// backend/src/lib/middleware.ts
import { createMiddleware } from 'hono/factory'
import { auth } from './auth'

export const requireAuth = createMiddleware(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  c.set('user', session.user)
  await next()
})
```

```typescript
// frontend/src/lib/auth-client.ts
import { createAuthClient } from 'better-auth/react'
export const authClient = createAuthClient({ baseURL: 'http://localhost:3001' })
```

---

## 8. Security
- Every DB query includes `where(eq(notes.userId, user.id))` — Drizzle makes this explicit
- Permanent delete checks `trashedAt IS NOT NULL` before hard deleting
- TipTap `bodyText` is plaintext extracted from TipTap JSON (strip HTML before storing)
- Search input passed to `to_tsquery` with parameterized query (no string interpolation)

---

## 9. Development Workflow

1. Init Bun workspace; install Hono, Drizzle, better-auth in `backend/`; Vite, React 19, TanStack in `frontend/`
2. Set `DATABASE_URL` (Neon connection string) in `backend/.env`
3. Write Drizzle schema → `bunx drizzle-kit generate && bunx drizzle-kit migrate`
4. Apply FTS raw SQL migration manually
5. Configure better-auth, implement `requireAuth` middleware
6. Implement Hono routes (notebooks → notes → search → tags)
7. Set up Vite + TanStack Router in frontend, configure Hono RPC client
8. Build three-panel layout shell with TanStack Router nested routes
9. Integrate TipTap with debounced auto-save
10. Add full-text search; wire tag cloud filter

---

## 10. Non-Functional Requirements

- API response target: <200ms for note list queries
- Debounced auto-save should not trigger more than once per second
- Search should return results within 300ms on 10k notes
- Mobile responsive down to 375px width
- Keyboard accessible navigation

---

## 11. Testing Plan

- Unit tests for validation and utility functions
- Integration tests for API routes
- E2E tests for auth flow, auto-save, and search

---

## 12. Observability

- Structured request logging
- Error logging middleware
- Query timing measurement

---

## 13. Security

- Zod validation on all request bodies
- Rate limiting on auth endpoints
- CSRF protection via same-site cookies
- Ownership validation for all note resources