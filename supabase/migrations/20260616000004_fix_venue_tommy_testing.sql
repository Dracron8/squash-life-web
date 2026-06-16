-- Fix venue name for Tommy TEsting tournament
-- venue data lives in clubs table, linked via tournament_details.club_id
UPDATE clubs
SET name = 'Sarnia Riding Club',
    city = 'Sarnia'
WHERE id = (
  SELECT club_id
  FROM tournament_details
  WHERE tournament_id = 'b36cfb5d-83fd-40a7-99ef-78511cf18aeb'
  LIMIT 1
);
