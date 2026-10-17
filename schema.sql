CREATE TABLE IF NOT EXISTS shares (
  share_code TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_content (
  id TEXT PRIMARY KEY,
  share_code TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_share_lesson ON user_content(share_code, lesson_id);
CREATE INDEX IF NOT EXISTS idx_share ON user_content(share_code);
