-- Add userIcon column to userProfiles table
ALTER TABLE userProfiles ADD COLUMN userIcon TEXT;

-- Create index for fast lookup
CREATE INDEX idx_userProfiles_email ON userProfiles(email);
