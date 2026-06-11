**Next Instructions for C2 / Internal Implementer – Start the Scheduling Engine + Basic Auto-Scheduler**

**Context:**
Prompts 004-007 are complete:
- Full 5-step TD wizard with edit support, persistence, create/update logic using buildTournamentDetailsPayload.
- TD list shows tournaments with good columns and edit links.
- Detail page has rich OVERVIEW (default) + other tabs (REGISTRATIONS, DRAW, SCORE ENTRY, SETTINGS) with success banners on create/update.
- Schedule visualization enhanced in both wizard SUMMARY and OVERVIEW (per-day blocks table, derived fields, notes on reconstruction).
- All styling consistent, build green.

We now have tournaments with defined day_schedules (or reconstructed), courts, match duration, rest rules, etc. from the wizard.

The next major piece for the "tourney scheduler" is to start implementing the actual scheduling: taking the setup data + registrations and generating a basic proposed court/time assignment for matches.

**Goals for this chunk (008):**
- Implement a basic scheduling engine that respects the tournament's rules (day_schedules blocks, courts_available, match_duration_minutes, min_rest_hours, max_matches_per_day, etc.).
- Generate a skeleton schedule: propose time slots per court per day, and assign matches (start with placeholders or actual registrations if present).
- Add UI in the detail page (new "SCHEDULE" section or enhance existing tabs) to view and (minimally) edit the proposed assignments.
- Store the generated schedule data (e.g., in a new `schedules` or `match_slots` table, or JSON in tournament_details for now – prefer simple and consistent with existing patterns).
- Keep it scoped: basic auto-generation + view/edit skeleton. Do NOT implement full draw generation, brackets, player registration flow, scoring, or advanced auto-scheduling yet. Those can build on this.
- Ensure it works with the existing OVERVIEW and wizard data.
- Maintain exact styling, patterns, and flutterParity helpers.

**Specific tasks:**

1. **Data model / helpers for scheduling**
   - Extend `lib/td/flutterParity.ts` with new types and helpers:
     - `ScheduledMatch` or `TimeSlot` type: court, day, start_time, end_time, match_id (nullable for placeholders), player1_id, player2_id, etc.
     - `generateBasicSchedule(tournamentDetail, registrations, matches?)`: function that takes the wizard data (day_schedules or flat fields, courts, durations, rest rules) + current registrations/matches and returns an array of proposed slots.
     - Basic logic:
       - For each day in day_schedules (or derived from dates + daily window).
       - Divide the daily window into slots of match_duration + buffer (min rest).
       - Respect max_matches_per_day.
       - Assign across available courts (parallel slots).
       - For rolling lunch or fixed, skip lunch periods.
       - If registrations exist, assign players round-robin style or simple seeding (keep simple – no full bracket logic).
       - Output should be storable (array of slot objects).
   - Add any small helpers like `calculateSlotsForDay(...)`, `applyRestRules(...)`.
   - Document that this is a starting point; future prompts can refine (e.g., integrate with actual matches from DRAW tab).

2. **Storage**
   - Decide on storage: For this chunk, add a `schedule_slots` JSONB column to `tournament_details` (or a simple new table `tournament_schedule_slots` with tournament_id, day, court, start, end, assignment data).
   - Update `buildTournamentDetailsPayload` or create a new `saveSchedule(slots)` helper to persist.
   - On load in detail page, fetch the slots alongside existing data.
   - Keep backward compat – if no slots yet, the generate function can be called on demand.
   - (If adding column requires migration, note it and use a JSON field in existing tournament_details for now to avoid DB changes.)

3. **UI in detail page (`app/td/tournaments/[id]/page.tsx`)**
   - Add or enhance a "SCHEDULE" tab (or section in OVERVIEW / new tab) that shows:
     - The defined day blocks (reuse viz from 007).
     - Generated schedule grid: per day, per court, list of time slots with assigned players (or "TBD") and match duration.
     - Simple "Generate / Regenerate Schedule" button that calls the helper and saves.
     - Basic edit: click a slot to assign a player/registration or clear (simple dropdown from current registrations).
   - Use existing patterns: cards, tables, red accents, OvRow where it fits, loading states on generate/save.
   - Show capacity/utilization (e.g., "X of Y slots used").
   - Link from OVERVIEW or header: "View / Generate Schedule".
   - If tournament status is setup_pending, allow generation; later statuses can be read-only or have limited edits.
   - Handle the case of no registrations yet: generate empty skeleton slots.

4. **Integration with wizard / creation**
   - On creation or update in the wizard (new/page.tsx), if day_schedules are defined, optionally auto-generate an initial empty schedule skeleton and save it alongside the details.
   - Or add a post-create step: after redirect, offer "Generate initial schedule" (but keep simple).
   - Ensure the schedule data is included in the detail fetch.

5. **Polish & constraints**
   - Full end-to-end: create tournament with schedule rules → see in list → open detail → generate/view/edit basic schedule → changes persist.
   - Error handling, loading spinners on generate/save.
   - Reuse as much as possible from flutterParity (capacity calc, time helpers).
   - No scope creep: do not touch DRAW tab logic, actual match creation, bracket views, player registration, scoring, or payments. This is purely the time/court assignment layer on top of the setup data.
   - If registrations are present, assign them to slots (simple round-robin or first-come). If not, leave placeholders.
   - Update any relevant types in TournamentDetail or new schedule types.

**Files you will likely touch:**
- `app/td/tournaments/[id]/page.tsx` (main UI for schedule tab/section, generate/edit UI)
- `lib/td/flutterParity.ts` (new scheduling types + generateBasicSchedule + reconstruct helpers)
- `app/td/tournaments/new/page.tsx` (minor: optional auto-generate skeleton on create)
- Possibly `app/td/page.tsx` (minor links if needed)
- Supabase queries in detail page to include schedule data.

**Do not** implement draw generation, brackets, full auto-scheduling with constraints, player registration, score entry, or payments.

**After you finish:**
Run the exact build verification:
```bash
cd /home/tb/ai-playground/squash_life_web && npm run build 2>&1 | tail -20
```

Report back with:
- Summary of the scheduling engine implemented (key logic in generateBasicSchedule).
- How the UI looks (describe the schedule grid / assignment UI, example with a 2-day tournament).
- End-to-end verification: create tournament with schedule rules → generate schedule in detail → edit a slot → see persistence.
- The full build output.
- Any issues (e.g., storage decision) or recommendations for 009 (e.g., integrate with actual matches, more advanced constraints, commit milestone).

Work from the current workspace state (incorporate all prior 004-007 changes). Make changes clean and consistent with existing code style. Use the new helpers you add.

If storage requires a non-trivial change, document clearly and implement a working prototype (e.g., in-memory or JSON in details for this chunk).

Success criteria: A TD can define schedule rules in the wizard, create the tournament, go to detail, generate a basic court/time assignment that respects the rules, and make simple edits to the assignments. Build green.