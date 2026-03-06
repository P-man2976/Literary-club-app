-- お題に締切機能を追加
ALTER TABLE posts ADD COLUMN deadline INTEGER;

-- コメント編集機能用
ALTER TABLE comments ADD COLUMN editedAt INTEGER;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_posts_deadline ON posts(deadline);
CREATE INDEX IF NOT EXISTS idx_comments_edited ON comments(editedAt);
