**Next Instructions for C2 / Internal Implementer – Advanced Auto-Scheduler with Constraints + Player Notifications + v1 Polish (013)**

**Context:**
012 is complete (commit of 004-011 as milestone, player "My Schedule" view added, final polish like Edit Again links, locked messaging, fidelity).

The basic scheduler (008-011) is in, with persistence, match linking, DRAW sync, edit support in wizard.

Now, to make it a real "tourney scheduler":

- Upgrade the generateBasicSchedule to a full auto-scheduler with advanced constraints (min rest between matches, max per day per player, court utilization, lunch, etc.).
- Use optimization or heuristics to assign matches to slots respecting all rules from wizard (day_schedules, rest, max/day, etc.) + current registrations/matches.
- Add player notifications: when schedule is generated/updated, notify players via email/SMS using the td_email/phone and player contacts (or existing comms).
- Player calendar: allow export of personal schedule as ICS file for the player's assigned matches.
- Polish for v1: any remaining from recs, update player-facing pages if needed, prepare release notes or docs in README or new file.
- Audit prep: full summary of scheduler v1 (004-013), test cases, known limits, next steps (e.g. 014: full bracket integration with schedule).

**Do not** over-scope into scoring, payments, or unrelated. Focus on scheduler engine, notifications, export, polish.

**Specific tasks:**

1. **Advanced Auto-Scheduler**
   - Enhance or replace generateBasicSchedule in flutterParity.ts with a more sophisticated version: `generateAdvancedSchedule(tournamentDetail, registrations, existingMatches?)`.
   - Logic:
     - Collect all "available" player participations from registrations (respecting draws, divisions).
     - Build possible slots from day_schedules + courts + durations + rest buffers + lunch.
     - Assign matches (create if needed, or use existing) to slots, enforcing:
       - No player in overlapping slots.
       - Min rest between a player's matches (across courts/days).
       - Max matches per player per day.
       - Even distribution across courts/days if possible.
       - Prefer sequential for same division or by rating.
     - Use a simple backtracking, greedy with scoring, or heuristic (e.g. sort players by constraints, assign greedily, retry on conflicts). Keep it efficient for small tournaments (e.g. <50 players).
     - Output slots with assigned players/matches, plus any unassigned notes.
   - Store the result in schedule_slots (as before).
   - Add options: "Optimize for fairness" or "Minimize travel" (simple flags).
   - Update the SCHEDULE tab to use the advanced generator (button "Generate Advanced Schedule").
   - In DRAW tab, use the advanced schedule to seed or assign matches if not already.

2. **Player Notifications**
   - When schedule is generated/updated (in SCHEDULE tab or on save), notify affected players.
   - Use existing td_email/td_phone_comm or player contacts from regs.
   - For email: simple text with their schedule slots, tournament info, link to player page.
   - For SMS: short version if phone available (use existing patterns or mock).
   - Trigger on generate, or manual "Notify Players" button.
   - Log notifications or mark in DB if needed (simple array or flag).
   - Respect player prefs if any (future), but basic for now: always notify on schedule publish.
   - Add to settings or wizard: toggle "Auto-notify on schedule changes".

3. **Player Calendar Export**
   - In the player "My Schedule" view (from 012), add "Export to Calendar" button.
   - Generate ICS file for the player's assigned matches/slots (using schedule data + match info).
   - Include: event title (e.g. "Match vs X - Court Y"), start/end, location (venue), description with tournament link, opponent, division.
   - Use a simple ICS string builder (no external lib).
   - Download as .ics, or offer "Add to Google/Apple" links (webcal or mailto for now).
   - Make it available in TD view too for export of full schedule.

4. **v1 Polish and Audit Prep**
   - Any remaining UX from recs: e.g., in wizard post-create "View Schedule" quick link, better empty states, confirm on major changes.
   - Update player tournament page with schedule if not fully from 012.
   - In TD OVERVIEW/SCHEDULE: show notification status, "Last generated" timestamp (add simple field or use updated_at).
   - Docs: update README or add SCHEDULER.md with v1 features, limits (e.g. "heuristic, not guaranteed optimal for large fields"), how to use.
   - Audit package: 
     - Full changelog summary for 004-013.
     - Test scenarios: create multi-day with constraints, generate advanced, edit, notify, export, view as player.
     - Open issues / 014 ideas (full constraint solver, real-time updates, mobile app parity).
     - Suggested commit: "feat(scheduler): v1 advanced auto-scheduler + notifications + player export (prompts 004-013)"
   - If day_schedules jsonb not yet added, do it now for fidelity (migration note + code).

**Files likely to touch:**
- lib/td/flutterParity.ts (advanced generate function, ICS helper).
- app/td/tournaments/[id]/page.tsx (SCHEDULE enhancements, notifications UI, export).
- app/tournament/[id]/page.tsx (player My Schedule export, notifications display).
- app/td/tournaments/new/page.tsx (minor links).
- Possibly supabase migration for schedule_slots or day_schedules jsonb if using.
- New or updated docs in root or build-prompts.

**After you finish:**
Run the build verification:
```bash
cd /home/tb/ai-playground/squash_life_web && npm run build 2>&1 | tail -20
```

Optionally test flows manually (create -> schedule -> notify -> player view/export).

Report back:
- Summary of advanced scheduler (key improvements in generate logic).
- Player notifications and export features (how triggered, what sent/exported).
- v1 docs/audit package (paste summary or key sections).
- Full build output.
- Recommendations for 014 (e.g. "constraint solver lib or custom", "real-time schedule updates", "full mobile parity", "performance for 100+ players").

Work from current state. Use search_replace. Follow all patterns (styling from wizard/OVERVIEW, helpers, fetch patterns, existing notification toggles in wizard).

If adding DB columns (schedule_slots jsonb, day_schedules jsonb), provide the migration SQL and update all queries/selects/payloads.

Success: Full featured scheduler v1 with advanced generation, notifications on changes, player export, all polished and documented, build green, audit-ready. C2/human can review the milestone commit.

If time, include a simple "Publish Schedule" button that locks further edits and sends final notifications.