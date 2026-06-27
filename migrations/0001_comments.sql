CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  case_slug TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT '匿名',
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  visitor_hash TEXT,
  created_at TEXT NOT NULL,
  moderated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_comments_slug_status ON comments (case_slug, status);
CREATE INDEX IF NOT EXISTS idx_comments_status_created ON comments (status, created_at DESC);
