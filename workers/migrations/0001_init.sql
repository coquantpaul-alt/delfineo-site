-- Delfineo auth schema. Cloudflare D1 (SQLite).
-- Run once:  npx wrangler d1 execute delfineo-auth --file=workers/migrations/0001_init.sql

CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,          -- uuid v4
  email           TEXT NOT NULL UNIQUE,      -- stored lower-cased
  tier            TEXT NOT NULL DEFAULT 'free',  -- 'free' | 'paid' (for later)
  is_subscriber   INTEGER NOT NULL DEFAULT 1, -- 1 = on Buttondown list, 0 = unsubscribed
  created_at      INTEGER NOT NULL,          -- unix seconds
  last_login_at   INTEGER
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS magic_links (
  token        TEXT PRIMARY KEY,             -- 32 random bytes, base64url
  email        TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL,             -- unix seconds, 15 min after created_at
  used_at      INTEGER,                      -- null until redeemed
  redirect_to  TEXT                          -- optional post-verify path, e.g. /en/research/xxx/
);

CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links(email);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires ON magic_links(expires_at);

CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY,             -- 32 random bytes, base64url
  user_id      TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL,             -- unix seconds, 30 days after created_at
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Rate limit: one magic link per email per 60 seconds
-- (enforced in the worker using max(created_at) from magic_links)
