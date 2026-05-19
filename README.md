# Notes

A personal, full-stack note-taking app — rich-text editor with auto-save, notebooks, tags, full-text search, pinning, and a soft-delete trash. Built as a Bun-workspace monorepo with end-to-end type safety from PostgreSQL all the way to the React client.

> The full product contract lives in [`SPEC.MD`](./SPEC.MD). This README documents how to run, develop, and reason about the codebase.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Available Scripts](#available-scripts)
- [API Reference](#api-reference)
- [Frontend Routes](#frontend-routes)
- [Testing](#testing)
- [Security](#security)
- [Observability](#observability)
- [Conventions](#conventions)

---

## Features

- **Authentication** — email + password via [better-auth](https://www.better-auth.com/), HttpOnly session cookies, CSRF protection, per-IP and per-user rate limits.
- **Rich-text editor** — [TipTap](https://tiptap.dev/) with debounced auto-save (1s after the last keystroke).
- **Notebooks** — create, rename, delete; delete is blocked while non-trashed notes still belong to the notebook.
- **Tags** — stored as a PostgreSQL `text[]`; sidebar tag cloud with counts; click to filter.
- **Full-text search** — PostgreSQL generated `tsvector` column on `title || body_text` with a GIN index and `websearch_to_tsquery`-based ranking.
- **Pin** — pinned notes always sort first.
- **Trash** — soft delete (`trashedAt`) with restore and permanent-delete actions.
- **End-to-end type safety** — the frontend imports the backend's inferred `AppType`; routes, params, query strings, and JSON bodies are all typed at the call site.

---

## Tech Stack

**Runtime** Bun · TypeScript 5

**Backend** Hono · better-auth · Drizzle ORM · Neon serverless PostgreSQL · Zod · Pino

**Frontend** React 19 · Vite 6 · TanStack Router (file-based) · TanStack Query · TailwindCSS 4 · TipTap 3 · Base UI · shadcn/ui

**Testing** Bun test runner (unit + integration) · Playwright (E2E)

---

## Architecture

```
┌──────────────────────────────┐         ┌────────────────────────────────────┐
│ React 19 + Vite              │         │ Hono on Bun                        │
│                              │  RPC    │                                    │
│  TanStack Router (file-based)│ ──────► │  /api/auth/**  → better-auth       │
│  TanStack Query              │  hc<>   │  /api/**       → requireAuth +     │
│  TipTap editor               │ cookies │                  notes / notebooks │
│  hc<AppType> typed client    │ ◄─────  │                  / tags / search   │
└──────────────────────────────┘         └─────────────────┬──────────────────┘
                                                           │ drizzle-orm/neon-http
                                                           ▼
                                                ┌──────────────────────┐
                                                │ Neon PostgreSQL      │
                                                │  + FTS (tsvector/GIN)│
                                                └──────────────────────┘
```

**End-to-end types.** `backend/src/index.ts` builds the Hono app with chained `.get()/.post()/...` handlers (or sub-apps mounted via `app.route()`), then exports `type AppType = typeof routes`. The frontend imports that type directly across the workspace boundary (`frontend/src/lib/client.ts`) and instantiates `hc<AppType>(...)`. Splitting handlers off into untyped helpers breaks RPC inference — keep route definitions chained.

**Auth boundary.** `better-auth` owns `/api/auth/**` directly via `app.on(['GET','POST'], '/api/auth/**', c => auth.handler(c.req.raw))`. Every other `/api` route is mounted on a sub-app guarded by `requireAuth` (`backend/src/lib/middleware.ts`), which sets `c.var.user` / `c.var.session`. New protected routes go on that sub-app.

**Database.** Neon serverless Postgres over HTTP (`drizzle-orm/neon-http`) — no connection pool, no websockets. `backend/src/db/index.ts` wraps the `neon()` callable with a `Proxy` so every issued query is timed and logged (slow queries above `SLOW_QUERY_MS` surface at WARN).

---

## Project Structure

```
note-taking-app/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Hono app entry — exports AppType
│   │   ├── routes/
│   │   │   ├── notes.ts          # CRUD + search + trash + restore
│   │   │   ├── notebooks.ts
│   │   │   └── tags.ts           # GET /tags — unique tags with counts
│   │   ├── db/
│   │   │   ├── schema.ts         # Drizzle tables (auth + app domain)
│   │   │   └── index.ts          # Neon client + query timing proxy
│   │   └── lib/
│   │       ├── auth.ts           # better-auth config
│   │       ├── middleware.ts     # requireAuth
│   │       ├── rateLimit.ts      # in-memory token-bucket limiter
│   │       ├── sanitize.ts       # TipTap JSON allowlist + bodyText derivation
│   │       ├── securityHeaders.ts
│   │       ├── errors.ts
│   │       └── logger.ts         # pino + per-request AsyncLocalStorage context
│   ├── tests/
│   │   ├── integration/          # bun test — hits the real DB via helpers
│   │   ├── helpers/              # db + auth + factory fixtures
│   │   └── setup.ts
│   ├── drizzle/                  # generated migrations + hand-written FTS
│   │   ├── 0000_perpetual_silver_fox.sql
│   │   └── 0001_add_fts.sql      # tsvector generated column + GIN index
│   └── drizzle.config.ts
├── frontend/
│   ├── src/
│   │   ├── main.tsx              # Router + QueryClient providers
│   │   ├── routes/               # file-based — TanStackRouterVite regenerates routeTree.gen.ts
│   │   │   ├── __root.tsx
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   ├── notes.tsx         # three-panel shell
│   │   │   ├── notes.$noteId.tsx
│   │   │   └── trash.tsx
│   │   ├── components/
│   │   │   ├── notes/            # NoteList, NoteEditor, NotebookSidebar, TagCloud, SearchBar, ...
│   │   │   └── ui/               # Modal, Drawer, Toast, Skeleton, Kbd, QueryError
│   │   ├── hooks/                # useNotes, useNotebooks, useTags, useKeyboardShortcut, ...
│   │   └── lib/
│   │       ├── client.ts         # hc<AppType> — typed RPC client
│   │       ├── auth-client.ts
│   │       └── debounce.ts
│   └── vite.config.ts
├── e2e/
│   ├── tests/                    # login, create-note, auto-save, search, trash-restore
│   ├── fixtures.ts
│   └── global-setup.ts
├── playwright.config.ts
├── SPEC.MD
└── package.json                  # Bun workspaces
```

---

## Prerequisites

- **[Bun](https://bun.sh/)** ≥ 1.1
- A **PostgreSQL** database. The dev defaults target [Neon](https://neon.tech/) (serverless Postgres over HTTP). Any Postgres 14+ instance works.
- Optionally a separate **test database** for integration / E2E.

---

## Quick Start

```bash
# 1. Install workspaces
bun install

# 2. Configure backend env
cp backend/.env.example backend/.env
#   - DATABASE_URL=<your Neon / Postgres URL>
#   - BETTER_AUTH_SECRET=$(openssl rand -base64 32)
#   - TEST_DATABASE_URL=<separate DB if you plan to run tests>

# 3. Configure frontend env (optional — defaults work for local dev)
cp frontend/.env.example frontend/.env

# 4. Apply migrations
cd backend && bun run db:migrate && cd ..

# 5. Run both services
bun run dev
```

The backend listens on `http://localhost:3000` and the frontend on `http://localhost:5173`. Vite proxies `/api` to the backend so the browser sees same-origin cookies for the better-auth session.

---

## Environment Variables

### `backend/.env`

| Variable               | Required | Default                  | Description                                                            |
| ---------------------- | -------- | ------------------------ | ---------------------------------------------------------------------- |
| `DATABASE_URL`         | yes      | —                        | Neon / Postgres connection string. Read at import time.                |
| `BETTER_AUTH_SECRET`   | yes      | —                        | Random 32+ byte secret. Generate with `openssl rand -base64 32`.       |
| `BETTER_AUTH_URL`      | yes      | `http://localhost:3000`  | Public URL of the API.                                                 |
| `FRONTEND_URL`         | no       | `http://localhost:5177`* | Used for CORS `origin`, CSRF allowlist, and better-auth trustedOrigins. |
| `PORT`                 | no       | `3000`                   | Backend HTTP port.                                                     |
| `TEST_DATABASE_URL`    | tests    | —                        | Separate database for integration + E2E tests.                         |
| `SLOW_QUERY_MS`        | no       | `100`                    | Queries above this are logged at WARN.                                 |
| `LOG_LEVEL`            | no       | `info`                   | Pino log level.                                                        |

\* The default in code is `5177` (used by Playwright); the `.env.example` ships `5173` for normal dev. Set this explicitly whenever the frontend runs on a non-default port.

### `frontend/.env`

| Variable        | Default                 | Description                                       |
| --------------- | ----------------------- | ------------------------------------------------- |
| `VITE_API_URL`  | `http://localhost:3000` | Used by both the RPC client and the auth client.  |

---

## Database

Schema lives in `backend/src/db/schema.ts`. The file is split into two regions:

1. **better-auth tables** (`user`, `session`, `account`, `verification`) — these have the exact shape better-auth expects. **Do not rename columns or tables.** To regenerate after adding auth plugins:
   ```bash
   cd backend && bunx @better-auth/cli generate
   ```
2. **App domain tables** (`notebooks`, `notes`) — every row carries a `userId` referencing `user.id` with `ON DELETE CASCADE`. Every query is scoped by `userId` (Drizzle makes the join explicit).

### Migrations

```bash
cd backend

bun run db:generate    # diff schema.ts → emit a new migration in drizzle/
bun run db:migrate     # apply pending migrations (uses DATABASE_URL)
bun run db:push        # push schema without a migration file (dev only)
bun run db:studio      # open Drizzle Studio
```

### Full-text search

`drizzle-kit` does not model generated columns, so the FTS index is a **hand-written** raw SQL migration (`backend/drizzle/0001_add_fts.sql`):

```sql
ALTER TABLE "notes" ADD COLUMN "fts" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce("title", '') || ' ' || coalesce("body_text", ''))
  ) STORED;

CREATE INDEX "idx_note_fts" ON "notes" USING GIN ("fts");
```

If you ever recreate the schema from scratch with `db:push`, you must reapply this file by hand.

---

## Available Scripts

Run from the repo root unless noted.

```bash
bun install                       # install both workspaces
bun run dev                       # backend + frontend concurrently
bun run test                      # bun test across all workspaces
bun run test:e2e                  # Playwright (boots its own dev servers)

# backend/
bun run dev                       # Hono on :3000 with --watch
bun run test                      # bun test (unit + integration)
bun run test:integration          # integration suite only
bun run db:generate | migrate | push | studio

# frontend/
bun run dev                       # Vite on :5173
bun run build                     # tsc -b && vite build
bun run preview                   # serve the production build
bun run typecheck                 # tsc --noEmit
bun run test                      # bun test (happy-dom + Testing Library)
```

---

## API Reference

All routes are prefixed with `/api`. Everything except `/api/auth/**` and `/api/health` requires a valid better-auth session cookie.

**Auth** (handled by better-auth — see [docs](https://www.better-auth.com/docs))

| Method | Path                       | Notes                                   |
| ------ | -------------------------- | --------------------------------------- |
| POST   | `/api/auth/sign-up/email`  | 16 KB body limit, 10 req/min/IP         |
| POST   | `/api/auth/sign-in/email`  |                                         |
| POST   | `/api/auth/sign-out`       |                                         |
| GET    | `/api/auth/get-session`    | Called on every page load — not throttled |

**Health**

| Method | Path           |
| ------ | -------------- |
| GET    | `/api/health`  |

**Current user**

| Method | Path        | Description                       |
| ------ | ----------- | --------------------------------- |
| GET    | `/api/me`   | Returns the authenticated user.   |

**Notes**

| Method | Path                              | Description                                                         |
| ------ | --------------------------------- | ------------------------------------------------------------------- |
| GET    | `/api/notes`                      | List. Query: `notebookId?`, `tag?`, `trashed?`, `pinned?`           |
| POST   | `/api/notes`                      | Create. Body validated by Zod; TipTap JSON sanitized server-side.   |
| GET    | `/api/notes/:id`                  | Get one (excludes trashed).                                          |
| PUT    | `/api/notes/:id`                  | Update. `bodyText` is re-derived from `bodyJson` server-side.       |
| DELETE | `/api/notes/:id`                  | Soft delete (sets `trashedAt`).                                      |
| POST   | `/api/notes/:id/restore`          | Clear `trashedAt`.                                                   |
| DELETE | `/api/notes/:id/permanent`        | Hard delete — only succeeds if `trashedAt IS NOT NULL`.              |
| GET    | `/api/notes/search`               | FTS via `websearch_to_tsquery`. Query: `q` (required, 1–200 chars). |

**Notebooks**

| Method | Path                       | Description                                                            |
| ------ | -------------------------- | ---------------------------------------------------------------------- |
| GET    | `/api/notebooks`           |                                                                        |
| POST   | `/api/notebooks`           | Body: `{ name: string }` (1–100 chars).                                |
| PUT    | `/api/notebooks/:id`       | Rename.                                                                |
| DELETE | `/api/notebooks/:id`       | 409 if the notebook still owns any non-trashed notes.                  |

**Tags**

| Method | Path         | Description                                          |
| ------ | ------------ | ---------------------------------------------------- |
| GET    | `/api/tags`  | Unique tags with counts, ordered by count then name. |

### Rate limits (in-memory token bucket, per-user unless noted)

| Bucket   | Limit                 | Window | Notes                                              |
| -------- | --------------------- | ------ | -------------------------------------------------- |
| `auth`   | 10 / IP               | 60s    | Only on POSTs to `/api/auth/*`.                    |
| `read`   | 300 / user            | 60s    | All authenticated GETs.                            |
| `mutate` | 120 / user            | 60s    | POST/PUT/PATCH/DELETE — covers 1s auto-save.       |
| `search` | 30 / user             | 60s    | Only on `/api/notes/search`.                       |

Every rate-limited response carries `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and on 429 a `Retry-After` header.

> The in-memory buckets are per-process. If you horizontally scale the backend, swap `rateLimit.ts` for a Redis-backed implementation.

### RPC client usage

```ts
import { client } from '@/lib/client'

const res = await client.api.notes.$get({ query: { trashed: 'false' } })
const notes = await res.json()                       // typed: Note[]

await client.api.notes[':id'].$put({
  param: { id: noteId },
  json:  { title, bodyJson: editor.getJSON() },
})
```

Always go through the RPC client — direct `fetch('/api/...')` bypasses inference and won't get cookie credentials.

---

## Frontend Routes

| Path              | Description                                                                 |
| ----------------- | --------------------------------------------------------------------------- |
| `/login`          | Email + password sign-in.                                                   |
| `/register`       | Account creation.                                                           |
| `/notes`          | Three-panel layout — `NotebookSidebar` + `NoteList` (with `SearchBar`) + `NoteEditor`. |
| `/notes/$noteId`  | Same layout, with the selected note loaded into the editor.                 |
| `/trash`          | Trashed notes — restore or permanently delete.                              |

The router context is initialized with `{ queryClient }` in `main.tsx`, so loaders and components pull the `QueryClient` via `Route.useRouteContext()` instead of importing a singleton.

---

## Testing

### Unit

```bash
bun run test                # all workspaces
```

- Backend unit tests live next to their source files (e.g. `lib/sanitize.test.ts`).
- Frontend unit tests run under `@happy-dom/global-registrator` + Testing Library.

### Integration

```bash
cd backend && bun run test:integration
```

Hits a real Postgres database — set `TEST_DATABASE_URL` in `backend/.env` first. Helpers in `backend/tests/helpers/` set up isolated users and factories per test.

### End-to-end

```bash
bun run test:e2e            # Playwright
```

`playwright.config.ts` boots both servers itself (backend with `DATABASE_URL=$TEST_DATABASE_URL`, frontend on `:5177`) and runs against headless Chromium. The current suite covers:

- `login.spec.ts` — register, sign out, sign in, wrong-password error.
- `create-note.spec.ts` — create a note and verify persistence after reload.
- `auto-save.spec.ts` — debounce → single PUT per burst, "Saved" indicator, persistence.
- `search.spec.ts` — `SearchBar` filters by FTS and restores the list when cleared.
- `trash-restore.spec.ts` — trash, restore, and permanent-delete round trip.

---

## Security

Defenses in place — keep them when you extend the codebase.

- **Auth ownership.** Every domain query is scoped by `userId` (`and(eq(notes.userId, user.id), ...)`). Drizzle makes the join explicit so it's reviewable in diffs.
- **Cookies.** `httpOnly`, `sameSite=lax`. `secure` is on in production and off in dev (browsers reject `Secure` over `http://localhost`).
- **CSRF.** Hono's `csrf({ origin: FRONTEND_URL })` rejects non-safe methods whose `Origin` doesn't match. Same-site cookies are the primary defense; this is belt-and-suspenders.
- **CORS.** Allowlisted to `FRONTEND_URL` with `credentials: true`. No wildcard.
- **Security headers.** Applied to every response via `lib/securityHeaders.ts`.
- **Body limits.** 16 KB on `/api/auth/*`, 1 MB on the protected API.
- **TipTap JSON sanitization.** `lib/sanitize.ts` re-walks the document against a node/mark allowlist (depth ≤ 20, ≤ 5,000 nodes), strips C0 control characters, and **re-derives `bodyText` server-side** so the FTS index can't be poisoned by a mismatched client field.
- **Search input.** Passed through `websearch_to_tsquery` as a parameter — no string interpolation.
- **Rate limiting.** Per-IP for auth, per-user for the rest. See the table above.
- **Permanent delete guard.** `DELETE /notes/:id/permanent` requires `trashedAt IS NOT NULL` in the `WHERE` clause; restoring then deleting is the only path to a hard delete.
- **Error responses.** A central handler in `index.ts` translates known `HTTPException`s into a unified shape and collapses everything else to a stack-trace-free 500.

---

## Observability

- **Request logging.** `requestLogger()` middleware logs every request with method, path, status, duration, and request id.
- **Per-request context.** `AsyncLocalStorage`-backed `requestContext` carries `requestId` and (after `requireAuth`) `userId` into every downstream log line — including DB query logs.
- **Query timing.** Every Drizzle query is proxied through a wrapper that logs duration and a 200-char SQL preview. Queries ≥ `SLOW_QUERY_MS` (default 100ms) surface at WARN.
- **Pino.** Configured in `lib/logger.ts`. Use `pino-pretty` locally; ship structured JSON to your log aggregator in prod.

---

## Conventions

A few project-specific rules — read `CLAUDE.md` for the full set.

- **Runtime is Bun.** Don't switch to npm / pnpm / node. Prefer `bun test` over Jest / Vitest.
- **Type safety crosses the workspace boundary.** Define every protected route on the `api` sub-app in `backend/src/index.ts` with chained `.get()/.post()/...`. Sub-apps mounted via `app.route()` keep types flowing into `AppType`. Untyped helpers break inference.
- **Validation at the edge.** Use `@hono/zod-validator` (`zValidator('json', schema)`, `zValidator('query', schema)`, ...). The client sees the validated input type.
- **Never bypass the RPC client.** Frontend network calls go through `client.api.*.$get/$post/...` wrapped in TanStack Query hooks — no raw `fetch` to `/api`.
- **TanStack Router is file-based.** Don't hand-edit `frontend/src/routeTree.gen.ts` — the `TanStackRouterVite` plugin regenerates it from files in `src/routes/`.
- **Path aliases.** Frontend uses `@/*` → `frontend/src/*`. The RPC import is intentionally relative (`../../../backend/src/index`) so `AppType` is inferred from source, not from a compiled artifact.
- **Migrations.** Use `db:generate` to diff `schema.ts`. The FTS column is a hand-written migration — never overwrite it.
- **Surgical changes.** Touch only what the task requires. Match existing style. See `CLAUDE.md` for the full philosophy.
