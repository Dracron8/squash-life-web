**Next Instructions for C2 / Internal Implementer – Commit Milestone + Player-Facing Schedule View + Final Polish (012)**

**Context:**
011 is complete (bidirectional sync between schedule slots and matches, deeper DRAW tab integration showing schedule times/assignments, status-based locks on schedule edits, clear schedule button, improved feedback and error handling).

The scheduler is now functional: generate from wizard rules creates/updates matches, visible in DRAW, locked appropriately, etc.

We have a solid v1 of the TD wizard (004-007) + basic scheduler (008-011).

**Goals for this chunk:**
- Commit all changes from 004-011 as a clean milestone commit (or PR description if no direct git).
- Add a player-facing "My Schedule" view in the player tournament page (app/tournament/[id]/page.tsx or related player views) so registered players can see their assigned slots/matches with times, courts, opponents from the schedule.
- Final polish: any remaining UX from prior recs (e.g., "Edit Again" after update, better notes on locked state, ensure day_schedules fidelity if jsonb was added).
- Prep for audit: provide a summary of all changes across prompts, suggested commit message, list of files touched, any open issues or next steps.
- Run full build and any manual verification steps.
- Keep scope: no new major features beyond player view and polish. Do not start advanced constraints or other big items.

**Specific tasks:**

1. **Commit / Milestone Prep**
   - Review uncommitted changes (git status, diff).
   - Stage and commit with a descriptive message, e.g.:
     "feat(td-wizard): complete 5-step setup wizard + basic scheduler v1 (prompts 004-011)
     
     - Full wizard with edit support, persistence, schedule viz (004-007)
     - Scheduling engine, UI, persistence, match linking, DRAW sync, status locks (008-011)
     - Files: app/td/tournaments/*, lib/td/flutterParity.ts, etc.
     - Build green. Ready for audit."
   - If in a branch or PR context, provide PR description instead.
   - Include before/after notes or screenshots if possible (but since text, describe key UX).

2. **Player-Facing "My Schedule" View**
   - In the player tournament page (app/tournament/[id]/page.tsx or the registration/schedule related player file), add a "My Schedule" section or tab for logged-in registered players.
   - Display:
     - The player's assigned slots/matches from the schedule (court, day/time, opponent if assigned, division).
     - Link to the overall schedule or "View Full Schedule" if public.
     - Status (e.g., confirmed, waitlist impact).
   - Use existing patterns: cards, tables, red accents, consistent with TD views but player-friendly.
   - Fetch using current registrations + schedule_slots + matches.
   - Handle unauth or non-registered: show "Register to see your schedule" or link.
   - If no schedule yet: "Schedule not generated – check back after TD opens registration."
   - Polish: responsive, clear times (use fmtTime etc. if available), perhaps export or calendar note (future).

3. **Final Polish from Prior Recs**
   - Add "Edit Again" link/button in post-update success states (in detail or wizard redirect).
   - Ensure consistent locked-state messaging across OVERVIEW, SCHEDULE, DRAW (e.g., "Setup locked after registration opens").
   - If day_schedules jsonb was added in prior, ensure it's used/roundtripped everywhere (wizard, viz, scheduler).
   - Minor UX: confirm on clear schedule, better loading on generate/sync, prevent duplicate assignments.
   - Any small bugs from previous impl (e.g., edge cases in distribution, status transitions affecting schedule).

4. **Audit Prep**
   - Summarize all changes across 004-011: key features added, files modified, DB impact (e.g., schedule_slots JSON or column).
   - Suggested commit message (as above).
   - Open items / next (e.g., 013: advanced auto-scheduler with full constraints, testing suite, player notifications, or deploy).
   - Verification steps for auditor: run through create -> schedule gen -> edit -> DRAW sync -> player view; check locks; build; etc.
   - Any tradeoffs (e.g., no raw per-day variation without jsonb).

**Files likely to touch:**
- build-prompts/ and README (for this prompt itself, but mainly code).
- app/tournament/[id]/page.tsx (or player schedule file) for "My Schedule".
- app/td/tournaments/[id]/page.tsx (minor polish, "Edit Again").
- Possibly lib/td/flutterParity.ts or new/page.tsx for final roundtrips.
- .git (for commit, via terminal).

**Do not** start new big features like advanced constraints, full player reg overhaul, or unrelated.

**After you finish:**
Run the build verification:
```bash
cd /home/tb/ai-playground/squash_life_web && npm run build 2>&1 | tail -20
```

Optionally run the app locally and describe a full user flow test.

Report back:
- The commit (or PR) details / message.
- Description of the new "My Schedule" player view (with example data).
- Polish items completed.
- Full build output.
- Audit package: summary of 004-011, files changed, verification steps, open recs for 013.
- Any issues found during polish.

Work from current state (post-011). Use search_replace for code, terminal for git/build. Follow all prior patterns (styling, helpers, fetch logic, etc.).

Success: Clean commit ready, player can see their schedule post-registration, all prior polish applied, build green, full audit report provided. Ready for human/C2 review and merge.

If day_schedules jsonb makes sense for fidelity, include the migration note and basic impl in this chunk.