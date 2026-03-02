-- Phase 4: Add columns to existing tables for user preferences and review source tracking
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS interleave_ratio FLOAT DEFAULT 0.25;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS interleave_category_penalty FLOAT DEFAULT 0.6;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT false;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS notification_hour INTEGER DEFAULT 9;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS quiet_hours_start INTEGER DEFAULT 22;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS quiet_hours_end INTEGER DEFAULT 7;

ALTER TABLE review_logs ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'quiz';
