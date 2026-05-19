-- Full-text search: tsvector generated column + GIN index.
-- Drizzle-kit does not model generated columns, so this migration is hand-written
-- and not derived from schema.ts.

ALTER TABLE "notes" ADD COLUMN "fts" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce("title", '') || ' ' || coalesce("body_text", ''))
  ) STORED;
--> statement-breakpoint
CREATE INDEX "idx_note_fts" ON "notes" USING GIN ("fts");
