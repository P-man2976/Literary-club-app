-- Add profile intro and AI summary columns
ALTER TABLE userProfiles ADD COLUMN selfIntro TEXT DEFAULT '';
ALTER TABLE userProfiles ADD COLUMN aiSummary TEXT DEFAULT '';
ALTER TABLE userProfiles ADD COLUMN aiTagsJson TEXT DEFAULT '[]';
