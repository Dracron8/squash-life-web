**Next Instructions for C2 / Internal Implementer – Deepen Schedule-DRAW Integration (010)**

**Context:**
009 is complete (schedule_slots persisted to tournament_details as JSON, loaded on page load in SCHEDULE tab, basic "CREATE MATCHES FROM SLOTS" that inserts placeholder matches using slots data).

The SCHEDULE tab now has generate (using generateBasicSchedule from 008), edit slots, and persist on generate/save.

Matches are created as simple placeholders when the button is clicked (if no matches exist).

**Goals for this chunk:**
- Use the persisted schedule slots to drive actual match creation more deeply (e.g., on "Generate Schedule", if no matches, auto-create matches from slots with proper round/division/draw_segment).
- Integrate the schedule view with the existing DRAW tab: make DRAW aware of the schedule (e.g., show schedule-based assignments or allow generating draw from schedule slots).
- Enhance auto-assign logic (better distribution of players from registrations into slots, respect more rules like min_rest if possible in assignment).
- Polish UX: loading states on match creation, feedback, handle status-based locks (e.g., if not setup_pending, disable generate/edit).
- Keep scope: build on existing DRAW (don't rewrite bracket logic), focus on schedule as source of truth for initial match creation/assignment. No full auto-scheduling with constraints beyond basic, no scoring changes, etc.

**Specific tasks:**

1. **Deeper match creation from slots**
   - Enhance the "CREATE MATCHES FROM SLOTS" or tie "Generate Schedule" to also create matches.
   - When generating/creating from slots:
     - For each slot, create a match record (tournament_id, round_number=1 or based on day, draw_segment='main', division from regs or default, player1_id/player2_id from slot or assigned, match_index).
     - If players not yet assigned in slots, do simple round-robin or sequential assignment from current registrations (better distribution: alternate players across courts/days).
     - After insert, fetchAll() to refresh matches and UI.
   - Store or link: optionally add a schedule_slot_ref or just use time/court to match later.
   - Make it idempotent-ish: if matches exist for the tournament, perhaps update players or warn "regenerate will reset?" (like existing DRAW regenerate).

2. **Integrate with DRAW tab**
   - In DRAW tab (existing), if schedule_slots exist, show a summary or use them to pre-populate/ influence the draw.
   - E.g., add a note or section: "Schedule-driven: X slots across Y days/courts. Generate Draw will respect schedule blocks."
   - When "GENERATE DRAW" is called (existing rpc generate_tournament_draw), or enhance to pass schedule info if the RPC supports (or post-process matches to assign times from slots).
   - For this chunk, simple: after draw generation, if schedule exists, assign times/courts to the generated matches by distributing matches into the schedule slots (match the number, assign sequentially).
   - Update matches with time/court info if the matches table has fields for it (or use a join; check schema – if not, just display in UI).
   - In DRAW UI, for each match, show assigned schedule slot if linked (e.g., "Court 1, Day 1 08:00-08:40").

3. **Enhance auto-assign / distribution**
   - Improve generateBasicSchedule or the assignment in UI: better player distribution (e.g., seed by rating if usr_rating available in regs, avoid same player back-to-back using min_rest).
   - When creating matches from slots, ensure diversity (no player in consecutive slots if possible).
   - Use existing calcCapacity or helpers for validation (e.g., don't over-assign).

4. **UX polish & constraints**
   - In SCHEDULE tab: disable generate/edit if tournament.status !== 'setup_pending' (with note like in OVERVIEW).
   - Loading/saving states for generate + create matches.
   - Feedback: "X matches created from schedule", "Schedule saved".
   - In DRAW: respect schedule for display/assignment (e.g., sort or group matches by schedule slot).
   - Handle no-regs case: generate empty slots + note "Register players to assign".
   - If regenerating, offer to clear existing matches first (like DRAW's REGENERATE RESET).
   - No scope creep: don't rewrite full DRAW/bracket logic, don't touch SCORE ENTRY beyond what's there, no new DB migrations if avoidable (use existing matches table + schedule_slots JSON).

**Files likely to touch:**
- app/td/tournaments/[id]/page.tsx (enhance SCHEDULE tab generate/create logic, tie to DRAW, status checks, better assignment).
- Possibly lib/td/flutterParity.ts (enhance generateBasicSchedule for better distribution, new helper like assignPlayersToSlots).
- Minor in other tabs if display needs schedule info.

**After you finish:**
Run the build verification:
```bash
cd /home/tb/ai-playground/squash_life_web && npm run build 2>&1 | tail -20
```

Report back:
- Summary of enhancements (how generate now creates/links matches, DRAW integration).
- UI/behavior: e.g., "Generate Schedule now auto-creates matches; DRAW shows schedule times; better distribution".
- End-to-end: create tournament with schedule rules + some regs → go to detail → SCHEDULE → Generate (creates matches + slots) → see in DRAW with assignments → edit a slot (updates linked match?).
- The full build output.
- Any issues (e.g., matches table fields for time/court) or recs for 011 (e.g., full auto-scheduler with constraints, commit all changes as v1 scheduler milestone, player-facing schedule view).

Work from current state (post-009 persistence). Use search_replace for edits. Follow all prior patterns (styling, OvRow, fetchAll, existing generateDraw, etc.). Test mentally for no breakage in other tabs.

If matches table needs time/court fields for display, note and use schedule_slots for viz instead of mutating matches.

Success: Schedule drives match creation/assignment, visible/integrated in DRAW, UX polished, build green. Ready for audit.