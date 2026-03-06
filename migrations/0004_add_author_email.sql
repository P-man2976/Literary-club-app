-- 投稿テーブルにauthorEmailカラムを追加
ALTER TABLE posts ADD COLUMN authorEmail TEXT;

-- コメントテーブルにauthorEmailカラムを追加
ALTER TABLE comments ADD COLUMN authorEmail TEXT;

-- インデックスを作成（検索最適化）
CREATE INDEX IF NOT EXISTS idx_posts_authorEmail ON posts(authorEmail);
CREATE INDEX IF NOT EXISTS idx_comments_authorEmail ON comments(authorEmail);
