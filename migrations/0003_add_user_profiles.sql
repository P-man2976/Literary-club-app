-- ユーザープロフィールテーブルを作成
CREATE TABLE IF NOT EXISTS userProfiles (
  email TEXT PRIMARY KEY,
  penName TEXT NOT NULL,
  createdAt INTEGER DEFAULT (strftime('%s', 'now')),
  updatedAt INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 更新日時の自動更新用インデックス
CREATE INDEX IF NOT EXISTS idx_userProfiles_email ON userProfiles(email);
