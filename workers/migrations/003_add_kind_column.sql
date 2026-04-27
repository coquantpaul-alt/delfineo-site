-- 003_add_kind_column.sql
-- Adds the `kind` column to an existing saved_articles table so the
-- worker can distinguish news briefs from research pieces. Only run
-- this if you ran an earlier version of 002_saved_articles.sql that
-- created the table WITHOUT a `kind` column. On a fresh database
-- where 002 was run with the current schema, this migration will
-- error with "duplicate column name: kind" — that error is safe to
-- ignore (the column is already there).
--
-- Run once:
--   npx wrangler d1 execute delfineo-auth --remote --file=workers/migrations/003_add_kind_column.sql

ALTER TABLE saved_articles
  ADD COLUMN kind TEXT NOT NULL DEFAULT 'news';
