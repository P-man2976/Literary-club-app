-- お題のサブタイトル機能を追加
ALTER TABLE posts ADD COLUMN subtitle TEXT;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_posts_subtitle ON posts(subtitle);
