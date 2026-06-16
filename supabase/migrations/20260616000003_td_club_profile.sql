-- Add club profile fields to profiles table so TDs don't re-enter club details each tournament
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS club_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS club_city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS club_province TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS club_country TEXT;
