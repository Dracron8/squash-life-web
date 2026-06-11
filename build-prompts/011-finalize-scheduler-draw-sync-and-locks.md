**Next Instructions for C2 / Internal Implementer – Finalize Scheduler-DRAW Sync, Status Locks, and Polish (011)**

**Context:**
010 is complete (schedule drives match creation on generate, basic integration with DRAW tab for display of assigned matches, enhanced auto-assign with player distribution from registrations, UX polish for status).

The SCHEDULE tab now generates slots and creates/updates matches in the DB. DRAW tab shows schedule info for matches.

**Goals for this chunk:**
- Make the integration bidirectional and robust: editing slots in SCHEDULE updates linked matches (or vice versa where sensible).
- Sync more deeply with DRAW: if schedule exists, pre-populate or influence DRAW generation/ display (e.g., assign times/courts from slots to matches, group by schedule in UI).
- Add proper status-based locks: disable schedule generation/editing in SCHEDULE and related if tournament.status !== 'setup_pending' (with clear UI notes, consistent with OVERVIEW).
- Polish: better error handling on match create/update from slots, loading states, feedback messages, ensure no data loss on regenerate.
- Minor: add a "Clear Schedule & Matches" option (with confirm), improve distribution if gaps.
- Keep scope: build on existing (don't rewrite DRAW RPC or bracket logic fully). Prepare for commit as a milestone (e.g., note in report "ready to commit 004-011 changes").

**Do not** implement player reg, scoring beyond existing, payments, or full advanced auto-scheduling constraints.

**Specific tasks:**

1. **Bidirectional sync between SCHEDULE and matches**
   - When editing a slot in SCHEDULE (player assign/clear), if a linked match exists, update the match's players (and vice versa if DRAW edits players, optionally sync back – but keep simple, focus SCHEDULE -> matches).
   - On "Generate Schedule" or "Create Matches from Slots", if matches exist, update their players/times from slots instead of only inserting new (or offer "sync" mode).
   - Store a link if needed (e.g., add schedule_slot_id or use time/court matching on matches if schema allows; otherwise use index or simple map).

2. **Deeper DRAW integration**
   - In DRAW tab: if schedule_slots exist, display per-match the assigned schedule info (court, time from slot).
   - Enhance "GENERATE DRAW" flow: after RPC, post-process matches to assign from available schedule slots (distribute matches into slots by day/court).
   - In DRAW UI, group or sort matches by schedule day/court if data present.
   - For REGENERATE, respect/clear schedule links.

3. **Status-based locks and UX**
   - In SCHEDULE tab: if status !== 'setup_pending', disable generate/edit/clear buttons, show note "Schedule locked (tournament not in setup)".
   - Same for any DRAW enhancements that modify schedule-driven data.
   - Consistent with existing (e.g., OVERVIEW note, status buttons only for certain statuses).
   - Add "Clear Schedule" button (deletes schedule_slots, optionally clears related matches with confirm). Disable if locked.

4. **Polish and error handling**
   - On match create/update from slots: better errors (e.g., "Failed to assign player X to slot"), loading overlay or per-button.
   - Feedback: after generate/sync, "X matches created/updated from schedule. View in DRAW."
   - Handle edge cases: more players than slots (waitlist or note), duplicate assignments, time overlaps.
   - Ensure fetchAll refreshes everything after schedule ops.
   - Minor perf: memoize slot grouping if complex.

**Files likely to touch:**
- app/td/tournaments/[id]/page.tsx (SCHEDULE tab logic, DRAW enhancements, status checks, clear button, error/feedback).
- Possibly lib/td/flutterParity.ts (helper for sync/assign if complex, e.g., distributeMatchesToSlots).
- No changes to wizard or list unless minor.

**After you finish:**
Run the build verification:
```bash
cd /home/tb/ai-playground/squash_life_web && npm run build 2>&1 | tail -20
```

Report back:
- Summary of sync/locks/polish (e.g., "Now bidirectional on edit, DRAW shows schedule times, locked for non-pending").
- UI examples: "Generate now updates existing matches; DRAW grouped by day/court; clear button added".
- End-to-end: create with schedule + regs → SCHEDULE generate (creates matches) → edit slot (updates match) → DRAW shows updated → change status to open → schedule locked.
- The full build output.
- Recommendations for 012 (e.g., "commit 004-011 as 'TD wizard + basic scheduler v1'", "add player schedule view", "full auto-scheduler with more constraints", "migrations for schedule_slots column if JSON insufficient").

Work from current state (post-009/010). Use search_replace. Follow all prior patterns (styling, fetchAll, OvRow, existing match logic, status handling). Scope strictly – enhance existing without rewriting.

If schema for matches lacks time/court, use schedule_slots for all viz and note "times from schedule, not stored on match yet".

Success: Scheduler and DRAW are synced, status locks prevent invalid edits, UX polished, build green, ready for audit/commit.