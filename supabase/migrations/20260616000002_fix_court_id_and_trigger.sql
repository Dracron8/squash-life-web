-- ============================================================
-- Fix 1: court_id UUID → TEXT so the scheduler can store "1", "2", etc.
-- Safe USING cast: any existing UUIDs render as their string representation.
-- In practice the column was empty/null so this is lossless.
-- ============================================================
ALTER TABLE matches ALTER COLUMN court_id TYPE TEXT USING court_id::TEXT;

-- ============================================================
-- Fix 2: Correct propagate_match_winner trigger
--
-- Replaces the broken advanced_plate_logic version (20260410000004)
-- that used LIMIT 1 for ALL losers instead of plate_match_id for R1.
--
-- Correct behaviour:
--   A. Winner propagation:  even match_index → player1 of next match
--                           odd  match_index → player2 of next match
--   B. Loser propagation (R1):  use plate_match_id link (set by generator)
--                               even → player1, odd → player2 of plate match
--   C. Loser propagation (R2):  only if player had a BYE in R1
--                               fill player1 then player2 of first open plate slot
-- ============================================================
CREATE OR REPLACE FUNCTION propagate_match_winner()
RETURNS TRIGGER AS $$
DECLARE
    loser_id  UUID;
    had_bye   BOOLEAN;
    target_id UUID;
BEGIN
    -- ── A. Winner → next match in same segment ────────────────────────────────
    IF NEW.winner_id IS NOT NULL AND NEW.next_match_id IS NOT NULL THEN
        IF NEW.match_index % 2 = 0 THEN
            UPDATE matches SET player1_id = NEW.winner_id WHERE id = NEW.next_match_id;
        ELSE
            UPDATE matches SET player2_id = NEW.winner_id WHERE id = NEW.next_match_id;
        END IF;
    END IF;

    -- ── B+C. Loser → plate draw (main segment only) ───────────────────────────
    IF NEW.winner_id IS NOT NULL AND NEW.draw_segment = 'main' THEN
        -- Identify loser (NULL if it was a BYE)
        IF NEW.winner_id = NEW.player1_id THEN
            loser_id := NEW.player2_id;
        ELSE
            loser_id := NEW.player1_id;
        END IF;

        IF loser_id IS NOT NULL THEN
            -- B. R1 loser: use plate_match_id set during bracket generation
            IF NEW.round_number = 1 AND NEW.plate_match_id IS NOT NULL THEN
                IF NEW.match_index % 2 = 0 THEN
                    UPDATE matches SET player1_id = loser_id WHERE id = NEW.plate_match_id;
                ELSE
                    UPDATE matches SET player2_id = loser_id WHERE id = NEW.plate_match_id;
                END IF;

            -- C. R2 loser: enter plate only if they received a BYE in R1
            ELSIF NEW.round_number = 2 THEN
                had_bye := EXISTS (
                    SELECT 1 FROM matches
                    WHERE tournament_id = NEW.tournament_id
                      AND round_number  = 1
                      AND draw_segment  = 'main'
                      AND (player1_id = loser_id OR player2_id = loser_id)
                      AND (player1_id IS NULL OR player2_id IS NULL)
                );

                IF had_bye THEN
                    -- Fill player1 first, then player2 of the earliest open plate R1 slot
                    SELECT id INTO target_id
                    FROM matches
                    WHERE draw_segment  = 'plate'
                      AND round_number  = 1
                      AND player1_id    IS NULL
                      AND tournament_id = NEW.tournament_id
                    ORDER BY match_index
                    LIMIT 1;

                    IF target_id IS NOT NULL THEN
                        UPDATE matches SET player1_id = loser_id WHERE id = target_id;
                    ELSE
                        SELECT id INTO target_id
                        FROM matches
                        WHERE draw_segment  = 'plate'
                          AND round_number  = 1
                          AND player2_id    IS NULL
                          AND tournament_id = NEW.tournament_id
                        ORDER BY match_index
                        LIMIT 1;

                        IF target_id IS NOT NULL THEN
                            UPDATE matches SET player2_id = loser_id WHERE id = target_id;
                        END IF;
                    END IF;
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_match_winner_set ON matches;
CREATE TRIGGER on_match_winner_set
AFTER INSERT OR UPDATE OF winner_id ON matches
FOR EACH ROW
EXECUTE FUNCTION propagate_match_winner();
