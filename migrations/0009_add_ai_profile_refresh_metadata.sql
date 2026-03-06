-- Add AI profile analysis refresh metadata (posts-based skeleton)
ALTER TABLE userProfiles ADD COLUMN aiUpdatedAt INTEGER DEFAULT 0;
