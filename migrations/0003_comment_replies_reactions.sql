-- 返信（1階層）と 👍👎 リアクション
ALTER TABLE comments ADD COLUMN parent_id TEXT;

CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments (parent_id);

CREATE TABLE IF NOT EXISTS comment_reactions (
  comment_id TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  reaction TEXT NOT NULL CHECK (reaction IN ('good', 'bad')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (comment_id, visitor_hash)
);

CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment ON comment_reactions (comment_id);
