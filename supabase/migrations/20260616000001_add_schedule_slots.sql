-- Add schedule_slots column to tournament_details
-- Required for schedule save functionality in app/td/tournaments/[id]/page.tsx

ALTER TABLE tournament_details ADD COLUMN IF NOT EXISTS schedule_slots text;
