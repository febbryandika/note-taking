import { sql } from 'drizzle-orm'
import { pgTable, text, timestamp, boolean, index } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'

// ── better-auth required tables ──────────────────────────────────────────────
// Do NOT rename these tables or columns — better-auth expects this exact shape.
// Run `bunx @better-auth/cli generate` to regenerate if you add auth plugins.

export const user = pgTable('user', {
  id:            text('id').primaryKey(),
  name:          text('name').notNull(),
  email:         text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull(),
  image:         text('image'),
  createdAt:     timestamp('created_at').notNull(),
  updatedAt:     timestamp('updated_at').notNull(),
})

export const session = pgTable('session', {
  id:        text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token:     text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId:    text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id:                     text('id').primaryKey(),
  accountId:              text('account_id').notNull(),
  providerId:             text('provider_id').notNull(),
  userId:                 text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken:            text('access_token'),
  refreshToken:           text('refresh_token'),
  idToken:                text('id_token'),
  accessTokenExpiresAt:   timestamp('access_token_expires_at'),
  refreshTokenExpiresAt:  timestamp('refresh_token_expires_at'),
  scope:                  text('scope'),
  password:               text('password'),
  createdAt:              timestamp('created_at').notNull(),
  updatedAt:              timestamp('updated_at').notNull(),
})

export const verification = pgTable('verification', {
  id:         text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value:      text('value').notNull(),
  expiresAt:  timestamp('expires_at').notNull(),
  createdAt:  timestamp('created_at'),
  updatedAt:  timestamp('updated_at'),
})

// ── Your app tables go below ──────────────────────────────────────────────────

export const notebooks = pgTable('notebooks', {
  id:        text('id').primaryKey().$defaultFn(() => createId()),
  userId:    text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  name:      text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('idx_notebook_user').on(t.userId),
])

export const notes = pgTable('notes', {
  id:         text('id').primaryKey().$defaultFn(() => createId()),
  userId:     text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
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
