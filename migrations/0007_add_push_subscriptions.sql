-- プッシュ通知の購読情報を保存
CREATE TABLE IF NOT EXISTS pushSubscriptions (
  id TEXT PRIMARY KEY,
  userEmail TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  keys TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

-- ユーザーごとに複数デバイス対応
CREATE INDEX IF NOT EXISTS idx_push_user ON pushSubscriptions(userEmail);
CREATE INDEX IF NOT EXISTS idx_push_endpoint ON pushSubscriptions(endpoint);
