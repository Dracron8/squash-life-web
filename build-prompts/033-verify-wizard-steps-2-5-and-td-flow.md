# Verification Prompt 033: Full 5-Step TD Wizard + Post-Create Flow (Local 3000)

## Goal
Confirm that the Tournament Director creation wizard (steps 1-5) is fully functional end-to-end on localhost:3000, that SUMMARY reviews the data from DETAILS/SCHEDULE/DAY, creation succeeds, and the resulting tournament detail page (OVERVIEW + SCHEDULE tab) reflects the entered values. C2 + human audit vs. the SQSH.LIFE.mhtml mock + prior prompts (004-012 etc.).

## Prerequisites (your local)
- Dev server running: `cd squash_life_web && npm run dev -- --hostname 0.0.0.0`
- Accessible at http://localhost:3000 (or your WSL Windows host IP)
- Logged into a real Supabase user that is a TD (has row in players or just auth).
- Supabase tables: clubs, tournaments, tournament_details (with RLS that lets the td_id owner insert/select their own).
- (Optional but recommended) A couple of test player registrations later for SCHEDULE tab.

## Test Steps (Wizard Creation)
1. Go to http://localhost:3000/td  → see "My Tournaments" + CREATE button. Click + CREATE TOURNAMENT.
2. Step 1 CLUB:
   - Fill Club Name (unique for you, e.g. "Test Caledon " + Date.now())
   - Fill a few fields: address, city, num_courts=4, surface=Hardwood, some toggles.
   - Click "SAVE CLUB & CONTINUE".
   - Expect: no error, advances to step 2 (DETAILS). Club is upserted in DB.
3. Step 2 DETAILS:
   - Tournament Name (required).
   - Pick draw_type.
   - Set start_date + end_date (must end >= start).
   - Toggle Singles on, set a fee.
   - Set registration window dates (optional).
   - Fill Rules: min rest 2-3, max matches/day=2, warm-up=10, forfeit=15.
   - Toggle waitlist on, set spots.
   - Fill a couple prizes/comms fields (welcome message etc.).
   - Scroll to bottom: see live "Estimated max players".
   - Click NEXT.
   - Expect: validation passes (or clear error), go to step 3.
4. Step 3 SCHEDULE:
   - Either:
     a) Click "+ ADD DAY" a few times and type times (e.g. 08:00 / 18:00), or
     b) With dates from step2, click "GENERATE FROM DATES" (populates empty blocks).
   - Edit labels + start/end times on 1-3 days. Make sure start < end.
   - Set Match Duration (e.g. 40).
   - Toggle rolling lunch or fixed + duration.
   - See the new **live per-day slot estimates** just added (e.g. "Day 1: ~12  Day 2: ~12").
   - Validation requires ≥1 day with both times.
   - Click NEXT.
5. Step 4 DAY:
   - Toggle check-in, scoring options, pick a court display mode.
   - Click NEXT.
6. Step 5 SUMMARY:
   - See 4 review cards:
     - Club (name, location, courts)
     - Tournament (name, format, dates, fees, + the extra rows: Min Rest, Max/Player/Day, Warm-up, Forfeit, Waitlist)
     - Schedule (match dur, lunch mode, the Defined Schedule Blocks table with START/END, Est. Capacity, + daily slots preview)
     - Day-of Logistics (check-in, live scoring etc.)
   - Each section has an "EDIT" link that jumps back (stepper also clickable for done steps).
   - Click CREATE TOURNAMENT (or UPDATE if ?edit=).
   - Expect: spinner, success, redirect to /td/tournaments/[newid]?created=1
7. On the detail page:
   - Green "Tournament created!" banner (dismissable).
   - Status = SETUP.
   - OVERVIEW tab: lots of OvRow cards (Tournament/Venue/Schedule/Entry). "Defined Schedule Blocks" section should reflect your day blocks (via reconstruct). Capacity etc.
   - Click EDIT SETUP → returns to wizard prefilled at SUMMARY (step 5). Change something minor → UPDATE TOURNAMENT → back with ?updated=1 banner.
   - REGISTRATIONS tab: "OPEN REGISTRATION" button (changes status). (Create 4-8 fake regs via Supabase studio or another flow if you want full schedule test.)
   - SCHEDULE tab:
     - Click GENERATE / REGENERATE SCHEDULE.
     - See slots grouped by dayLabel, with court/time, editable player selects (from regs), clear buttons.
     - SAVE SCHEDULE TO DB.
     - (If regs) CREATE MATCHES FROM SLOTS button (populates matches table).
   - DRAW tab: GENERATE DRAW (calls rpc; if no rpc yet it will error — note for later).
   - Confirm all wizard-entered values (dates, rules, day blocks, fees, check-in, etc.) appear correctly in OVERVIEW and are usable downstream.

## What "the rest" (steps 2-5) must feel like
- No more "This step is coming in the next chunk" (that was only in the old deployed snapshot in your SQSH.LIFE.mhtml).
- All fields from INITIAL + WizardForm are wired in the forms.
- Validation prevents bad progress.
- LocalStorage resumes you (close tab, reopen /new → back on last step with data).
- Edit roundtrip (loadWizardFormFromDb + build payloads) is lossless for the core fields.
- Post-create the detail OVERVIEW + SCHEDULE visualize what you set in creation.

## Build / Lint Check (run these)
```bash
cd squash_life_web
npm run build   # must exit 0, "Compiled successfully", "Finished TypeScript"
# optional
npx tsc --noEmit
```

## Audit Notes for C2 / Human
- Compare rendered SUMMARY review richness to the visual intent in SQSH.LIFE.mhtml (stepper, cards, dark theme, red accents, section heads).
- Confirm no dead code / unused imports broke (cleaned reconstructDaySchedules from new/page import).
- Check that day_schedules with rolling/fixed lunch + courts produce sensible capacity + per-day previews both in wizard and after save.
- Note any Supabase RLS or missing columns that block create (share exact error).
- Later prompts (013+) cover advanced scheduler, notifications, v2 brackets etc. — this 033 focuses on the core 5-step creation + immediate post-create TD pages.

## Pass Criteria
- You can create a full tournament from step 1→5 on localhost:3000 with no console errors.
- All entered data survives to the /td/tournaments/[id] OVERVIEW and is editable via "EDIT SETUP".
- SCHEDULE tab in detail can generate/edit/persist slots derived from the wizard rules.
- Build green.
- Report: "033 PASS" + any screenshots or specific deltas vs mock/prompts.

Last updated: post-commit 2d1bf51 (feat(td): 5-step wizard + basic scheduler v1 + 033)

Commit 2d1bf51 captured the core TD implementation + all historical prompts up to 033.
Run this audit on your local dev server (npm run dev -- --hostname 0.0.0.0) with a TD-role Supabase user.
```

Now run a quick ls or just note the file.