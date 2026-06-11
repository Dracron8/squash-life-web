**Next Instructions for C2 / Internal Implementer – Polish End-to-End Flow + Add Edit Support for Existing Tournaments + Enhance Schedule Visualization**

**Context:**
Prompt 006 (and prior 004/005) is complete:
- Full 5-step TD wizard with persistence (form + step in localStorage), clickable stepper, creation logic using buildTournamentDetailsPayload, clears state, redirects to detail with success banner.
- TD list shows newly created tournaments at the top with useful columns (name, venue, dates, registered count, draw_type, status).
- Tournament detail has OVERVIEW as default tab with clean cards showing Tournament, Venue, Schedule (daily window, match duration, rest, lunch as rolling/fixed, forfeit), Entry & Fees (now including doubles), Day-of logistics, etc.
- Styling consistent (dark neutral + red accents, OvRow helpers).
- Build is green.

The user can create tournaments via the web wizard and see them in the list + a useful review page. However:
- The flow is create-only so far. No way to go back and edit an existing tournament's setup (e.g., adjust schedule, fees, day-of rules after creation).
- The schedule visualization in OVERVIEW is good but derived/collapsed (from day_schedules in wizard Step 3 via the payload). We should make the original per-day blocks more explicit if possible, or at least surface the raw schedule data the user defined.
- End-to-end experience could use polish: better error handling on create/edit, confirmation on redirect, ability to jump from list/detail back into the wizard to edit.
- Memory/WSL stability issues have been mitigated on the host side.

**Goals for this chunk (007):**
- Add full "Edit" support: From the TD list or the detail page, allow loading an existing tournament back into the 5-step wizard (pre-populate all form fields from DB + tournament_details + club). Allow changes across any step and "Update Tournament" (which updates both tournaments and tournament_details rows).
- Enhance schedule visualization: In the wizard SUMMARY and especially the detail OVERVIEW, make the day_schedules (per-day label/start/end blocks from Step 3) more prominent and explicit. If the raw day_schedules aren't stored, either store them (add to payload + DB if schema allows) or reconstruct/display the effective schedule clearly. Add a small table or list of the defined day blocks.
- Polish the end-to-end create/edit/view flow: Better validation, loading states, success feedback, ability to cancel/edit mid-wizard without losing data, ensure redirect after update also works nicely.
- Keep everything consistent with existing patterns, styling, and the flutterParity helpers (buildTournamentDetailsPayload, calcScheduleMaxPlayers, etc.).
- Do not implement draw generation, brackets, player registration, score entry, auto-scheduling, or payment flows. Stay focused on the setup wizard + list + overview integration.

**Specific tasks:**

1. **Add Edit capability to the wizard**
   - Update the wizard route/page to support loading an existing tournament (e.g., via query param ?edit=TOURNAMENT_ID or from a button in the detail/list).
   - On load for edit: Fetch the tournament + tournament_details + club, pre-populate the full WizardForm (including _club_id, day_schedules if available or reconstruct from flat fields, all Step 2/3/4 values).
   - Change the final button on SUMMARY for edit mode to "UPDATE TOURNAMENT" (with loading state).
   - In createTournament / new update function: If editing, do UPDATEs instead of INSERTs for tournaments and tournament_details. Use the same payload helper.
   - Clear LS only on successful update/create. Handle ownership check (only the td can edit their own).
   - Update navigation: From TD list or detail OVERVIEW, add "Edit Setup" buttons/links that open the wizard in edit mode.
   - Preserve the ability to jump between steps while editing (stepper still works).

2. **Enhance schedule visualization**
   - In the wizard (SUMMARY step): Already has some capacity preview from day_schedules. Make the list of defined day blocks (from form.day_schedules) more visible in the review cards (e.g., a small table: Day | Start | End).
   - In the detail OVERVIEW (app/td/tournaments/[id]/page.tsx): Enhance the Schedule card (or add a dedicated "Defined Schedule Blocks" section) to list the original day_schedules if we can surface them. 
     - Option A (preferred if easy): Update the creation/update logic to also store the raw day_schedules array (e.g., add a JSON column or use existing fields; check current schema via queries or flutterParity).
     - Option B: Reconstruct and display the effective per-day schedule from the stored flat fields + rules (daily window, rolling lunch, etc.) + number of days.
     - Show it as a clean list or table with labels, times, and any computed slots per day (using courts + match_duration).
   - Reuse or extend OvRow / similar helpers for consistency. Add the same "Schedule" visualization to the wizard SUMMARY for parity.
   - Update any relevant types in lib/td/flutterParity.ts if needed for round-tripping day_schedules.

3. **Polish end-to-end flow**
   - Add "Cancel" / "Discard Changes" in the wizard (especially in edit mode) that confirms and redirects back to list or detail without saving.
   - Improve error handling: Show clear errors from Supabase inserts/updates in the existing error banner style. Validate more strictly before allowing create/update (e.g., at least one valid day_schedule, consistent dates).
   - Post-create / post-update: Ensure redirect to detail with success banner works for both create and update. Optionally add a "Back to List" or "Edit Again" link.
   - In the TD list: Make the cards or add actions for "Edit" that link to the wizard in edit mode. Keep the list refreshing nicely after create/update (server component or revalidate).
   - In the detail OVERVIEW: Add an "Edit Setup" button that links to the wizard in edit mode for this tournament. Show a note if the tournament is no longer in 'setup_pending' (edits might be limited later).
   - Test the full loop mentally/in practice: Create → see in list → click to detail/OVERVIEW → edit some fields (e.g., add a day or change fees) → update → see changes reflected.

4. **Data / helpers**
   - Prefer reusing buildTournamentDetailsPayload for both create and update.
   - If storing raw day_schedules, extend the payload or add a separate step (but keep backward compat with existing flat fields).
   - Ensure all wizard fields (including from Step 4 day-of) round-trip correctly on edit.
   - No DB migrations unless absolutely required for day_schedules storage – prefer using existing columns or a simple JSON field if available.

**Do not** touch draw generation, brackets, registrations, scoring, payments, or auto-scheduling logic. Those come later.

**Files you will likely touch:**
- app/td/tournaments/new/page.tsx (edit mode, update logic, navigation from wizard)
- app/td/tournaments/[id]/page.tsx (add Edit button in OVERVIEW, enhance Schedule visualization, possibly the OverviewTab component)
- app/td/page.tsx (add Edit action in list cards if desired)
- lib/td/flutterParity.ts (if needed for better day_schedules support or types)
- Possibly small updates to types or queries for round-tripping.

**After you finish:**
Run the exact build verification:
```bash
cd /home/tb/ai-playground/squash_life_web && npm run build 2>&1 | tail -20
```

Report back with:
- Summary of changes made (create vs edit paths, schedule viz updates).
- Whether create + edit flow works end-to-end (new tournament appears in list, can be loaded for edit, changes reflected in OVERVIEW after update).
- How the schedule is now visualized in wizard SUMMARY and detail OVERVIEW (show example of a multi-day schedule display).
- The full build output.
- Any issues found or recommendations for the next prompt (e.g., actual scheduling engine, committing these changes, etc.).

Work directly in the current workspace state (there may be uncommitted changes from prior work on 004-006 – incorporate them). Use clean, consistent patterns matching the existing code (LS keys, OvRow style, payload helpers, dark/red styling, Supabase patterns). Be thorough but scoped – this is the "edit + visualization polish" chunk before we move to real scheduling features.

If the raw day_schedules storage requires a schema change that's not trivial, document it clearly and implement the best possible visualization with current data (derived schedule + note about raw blocks).

**Success criteria:** A TD can create a tournament via the wizard, see it in the list and OVERVIEW, go back into the wizard to edit any step (including schedule), save the update, and see the changes immediately reflected – all with good UX and no crashes in the flow.