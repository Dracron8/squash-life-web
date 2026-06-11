**Next Instructions for C2 / Internal Implementer – Persist Schedule Slots + Link to Matches (009)**

**Context:**
008 is complete (in-memory SCHEDULE tab with generateBasicSchedule, edit slots, demo save, using the helper from flutterParity).

The schedule is currently in-memory only for the tab session.

To make it real:
- Persist the schedule_slots (as JSON or structured) in tournament_details or a dedicated field.
- Load saved slots when opening the detail page / SCHEDULE tab.
- Basic linking: if matches exist or on generate, associate slots with matches (or create placeholder matches from slots).
- Keep scope: no full bracket logic, just persist + basic link for the scheduler skeleton.

**Goals:**
- Make schedule persist across reloads and for the tournament.
- Load saved schedule in the UI.
- Optional: use slots to seed matches in the matches table (basic, for DRAW tab integration without over-scope).

**Tasks:**
1. **Persist schedule_slots**
   - Decide on storage: Add `schedule_slots` as JSONB or text (JSON string) to tournament_details.
   - Update the long select in fetchAll to include schedule_slots in tournament_details( ... , schedule_slots ).
   - In the save function (in SettingsTab), include schedule_slots: JSON.stringify(scheduleSlots) or the array in the update for tournament_details.
   - Add schedule_slots to the local state/f in settings if editing there, but mainly tie to the SCHEDULE tab state.
   - On load in fetchAll / setTournament, parse schedule_slots from detail if present, set to scheduleSlots state.

2. **Load in UI**
   - In the component, after fetch, if detail.schedule_slots, setScheduleSlots( JSON.parse or the value ).
   - In SCHEDULE tab, use the loaded slots for display/edit.
   - On "SAVE SCHEDULE", update the state and trigger the save that persists it (or direct supabase update for the field).

3. **Link to matches (basic)**
   - If matches exist, try to match slots to matches by time/court or simple assignment.
   - Or on generate, if no matches, create basic placeholder matches from the slots (insert to matches table with tournament_id, round etc from slot).
   - Show in the tab which slots have matches linked.
   - Keep simple – no full logic, just seed.

4. **Polish**
   - Handle errors on persist.
   - Show "Saved" feedback.
   - If status not setup_pending, make schedule read-only or note limited edits.
   - Ensure it works with edit mode in wizard (schedule can be re-generated after edit).

**Files:**
- app/td/tournaments/[id]/page.tsx (fetch select, state load, save tie-in, tab enhancements)
- Possibly the settings save function.
- No change to wizard unless for re-gen after edit.

**After:**
Run build, report:
- Persist works (reload keeps slots).
- Link basic (slots create or associate matches).
- Build output.
- Recommendations for 010 (e.g. full match creation from schedule, integrate with DRAW tab more deeply, commit changes).

Work from current state (post-008 edits). Use search_replace. Follow style. Note any DB schema needs (user can add column schedule_slots jsonb to tournament_details if not present).

Success: Schedule persists, loads on page, basic link to matches possible. Build green.