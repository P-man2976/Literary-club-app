-- Full migration reset: old pen names/icons can be discarded
-- This clears existing profile rows so all users re-register under the new schema and R2 flow.
DELETE FROM userProfiles;
