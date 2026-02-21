-- 投稿テーブル (DynamoDB: lit-club-page → SQL)
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author TEXT NOT NULL,
  tag TEXT NOT NULL DEFAULT '創作',
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

-- コメントテーブル (DynamoDB: lit-club-comments → SQL)
CREATE TABLE IF NOT EXISTS comments (
  postId TEXT NOT NULL,
  commentId TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  author TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE
);

-- いいねテーブル (DynamoDB: lit-club-likes → SQL)
-- 複合主キー: postId + userId
CREATE TABLE IF NOT EXISTS likes (
  postId TEXT NOT NULL,
  userId TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  PRIMARY KEY (postId, userId),
  FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE
);

-- インデックス（クエリパフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_posts_createdAt ON posts(createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_comments_postId ON comments(postId);
CREATE INDEX IF NOT EXISTS idx_likes_postId ON likes(postId);
