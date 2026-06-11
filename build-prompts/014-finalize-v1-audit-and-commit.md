**Next Instructions for C2 / Internal Implementer – Finalize Scheduler v1, Full Audit Prep, and Commit (014)**

**Context:**
013 is complete (advanced auto-scheduler with constraints, player notifications on changes, ICS calendar export for My Schedule, v1 polish, docs, and audit prep notes).

The TD wizard + scheduler is now at a feature-complete v1 state:
- 5-step wizard with edit support, persistence, creation/update.
- Scheduling engine (basic -> advanced) with day_schedules, generate, persist, edit, DRAW sync, match creation from slots.
- Player-facing My Schedule with export.
- Notifications, status locks, UX polish across TD and player views.
- All consistent with Flutter parity, existing styling, helpers in flutterParity.ts, and Supabase patterns.

It's time to treat this as a milestone: audit the whole thing, fix any remaining issues from the audit, update docs, and commit as "TD scheduler v1".

**Goals for this chunk:**
- Perform a self-audit of the entire scheduler (004-013): list all features, test key flows mentally/in code, identify gaps/bugs.
- Fix any issues found during audit (e.g., edge cases in advanced scheduler, notification triggers, export formatting, status handling, data round-tripping).
- Finalize docs: update main README or add SCHEDULER.md with v1 features, usage, limits, architecture notes (e.g., day_schedules derivation, payload usage).
- Prepare audit package: summary of changes since start, feature matrix, test scenarios, open issues for 015, suggested commit message.
- Commit the changes (or provide full commit-ready diff description if no direct access): clean message referencing the prompts 004-014.
- Run full verification (build, and describe manual test of create -> schedule -> notify -> player view -> export).

**Do not** start new major features (e.g., full bracket auto-gen, payments, mobile app). Focus on finalizing and shipping v1.

**Specific tasks:**

1. **Self-Audit and Bug Fixes**
   - Review all scheduler-related code: wizard (new/page.tsx), list (td/page.tsx), detail ( [id]/page.tsx including SCHEDULE/DRAW/OVERVIEW), player views (tournament/[id]/page.tsx), flutterParity.ts (payloads, generate, reconstruct, etc.).
   - Audit categories:
     - Functionality: Does create/edit schedule work end-to-end? Generate advanced respects all rules (rest, max/day, lunch, courts)? Notifications trigger correctly? Export produces valid ICS? Player sees correct personal schedule?
     - Data: Round-tripping of all wizard fields (including day_schedules if jsonb added, fees, day-of)? Schedule slots persist and load correctly? Matches created from slots have correct data?
     - UX/Status: Locks prevent edits post-setup? Feedback clear on generate/update/notify? Empty states and errors handled?
     - Performance/Edge: Handles 0 regs, 1 day, max players, conflicts? No N+1 queries or heavy ops on generate?
     - Consistency: Matches Flutter parity notes, existing code style, no duplication.
   - Fix any bugs found (use search_replace). Prioritize critical (data loss, broken flows) then polish.
   - If jsonb for day_schedules/schedule_slots not fully integrated, complete it here (migration + code updates).

2. **Finalize Documentation**
   - Create or update SCHEDULER.md (or section in main README) with:
     - v1 feature list (wizard steps, scheduling engine, notifications, player export, integration points).
     - How it works (high-level: wizard -> payload -> schedule gen -> persist -> match creation -> views/notifications).
     - Usage: TD creates tournament -> generates schedule -> players see/export. Status transitions.
     - Limits and known issues (e.g., heuristic scheduler, no full optimization for 100+ players yet, derived vs raw day_schedules).
     - Architecture notes (key files, helpers in flutterParity, storage in tournament_details).
     - Future (015+ ideas: advanced constraints solver, real-time collab, full bracket from schedule).
   - Update any inline comments or wizard help text if gaps found in audit.

3. **Audit Package and Prep**
   - Create a summary document (in build-prompts/ or as AUDIT.md):
     - Changes overview: list of prompts 004-014, files touched, lines added.
     - Feature matrix: what works for TD vs Player.
     - Verification steps: step-by-step to test create -> schedule -> notify -> player export -> edit -> re-generate.
     - Test scenarios (at least 5-7, including edges like no players, multi-day, waitlist, status changes).
     - Open issues / 015 roadmap.
     - Recommended commit message and scope.
   - If possible, note any DB migrations needed (e.g., for jsonb columns) and include SQL.

4. **Commit / Milestone**
   - Stage relevant files (app/td/**, lib/td/flutterParity.ts, player tournament views, any migrations/docs).
   - Commit with message like: "feat(td): v1 tournament setup wizard + advanced scheduler (prompts 004-014)
     
     - Complete 5-step wizard with edit, persistence, create/update.
     - Scheduling engine (generate, persist, edit, DRAW sync, match creation from slots).
     - Player My Schedule + ICS export, notifications on changes.
     - Status locks, UX polish, audit prep.
     - Build green. See build-prompts/ for prompt history and AUDIT.md."
   - If no direct commit, provide the full list of changes and message for manual commit.

**Files likely to touch:**
- Most scheduler-related: app/td/tournaments/[id]/page.tsx, app/td/page.tsx, app/td/tournaments/new/page.tsx, lib/td/flutterParity.ts, app/tournament/[id]/page.tsx.
- New/updated docs: SCHEDULER.md, AUDIT.md (in root or build-prompts).
- Possibly supabase migrations if jsonb finalization needed.
- build-prompts/014-... (this prompt) and README.

**After you finish:**
Run the build verification:
```bash
cd /home/tb/ai-playground/squash_life_web && npm run build 2>&1 | tail -20
```

Optionally describe a manual end-to-end test of the full v1 flow.

Report back:
- Audit findings and bugs fixed (list with before/after).
- Docs created/updated (key sections or paste summaries).
- Audit package contents (features, tests, open items).
- Commit details (message, files, or diff summary).
- Full build output.
- Recommendations for 015 (e.g., "advanced constraint solver", "real-time schedule collab", "full bracket from schedule", "deploy and monitor").

Work from current state (post-013). Use search_replace for code, write for new docs. Follow all prior patterns (styling, helpers, fetch, existing notification toggles, OvRow, etc.).

If adding final migrations, provide the SQL and update all related queries/payloads/selects.

Success: Full v1 audit passed (with fixes), docs complete, milestone committed (or ready), build green, comprehensive report for human/C2 audit. The scheduler is now a shippable feature set.

Include in the audit report a note on how the prompts (004-014) guided the incremental build, and any lessons for future chunks.