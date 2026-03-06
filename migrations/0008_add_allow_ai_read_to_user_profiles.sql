-- AI講評への投稿利用可否（1: 許可, 0: 拒否）
ALTER TABLE userProfiles ADD COLUMN allowAiRead INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_userProfiles_allowAiRead ON userProfiles(allowAiRead);
