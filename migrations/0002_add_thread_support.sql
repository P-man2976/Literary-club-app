-- お題スレッド機能のサポートをposts テーブルに追加
-- parentPostId: 親投稿のID (NULLの場合は独立した投稿またはお題投稿)
-- isTopicPost: お題投稿フラグ (1の場合はお題、0の場合は通常投稿)

ALTER TABLE posts ADD COLUMN parentPostId TEXT;
ALTER TABLE posts ADD COLUMN isTopicPost INTEGER DEFAULT 0;

-- INDEXを追加してクエリパフォーマンスを向上
CREATE INDEX IF NOT EXISTS idx_posts_parentPostId ON posts(parentPostId);
CREATE INDEX IF NOT EXISTS idx_posts_isTopicPost ON posts(isTopicPost);
CREATE INDEX IF NOT EXISTS idx_posts_topic_created ON posts(isTopicPost DESC, createdAt DESC);
