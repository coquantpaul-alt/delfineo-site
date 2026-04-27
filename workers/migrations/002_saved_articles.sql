-- 002_saved_articles.sql
-- Adds the saved_articles table used by /api/auth/saved endpoints
-- so signed-in users' bookmarks sync across devices. Stores both
-- news briefs and research pieces — the `kind` column distinguishes
-- them so the saved page can route to /lang/news/<slug>/ vs
-- /lang/research/<slug>/.
--
-- Run once against the production D1:
--   npx wrangler d1 execute delfineo-auth --remote --file=workers/migrations/002_saved_articles.sql
-- Re-running is safe (IF NOT EXISTS).
--
-- NOTE: if this migration already ran without the `kind` column,
-- run 003_add_kind_column.sql to upgrade in place.

CREATE TABLE IF NOT EXISTS saved_articles (
  user_id  TEXT    NOT NULL,
  kind     TEXT    NOT NULL DEFAULT 'news',  -- 'news' | 'research'
  slug     TEXT    NOT NULL,
  saved_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, kind, slug),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_saved_user_savedat
  ON saved_articles (user_id, saved_at DESC);
