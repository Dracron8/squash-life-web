**Next Instructions for C2 / Internal Implementer – Advanced Constraint-Based Auto-Scheduler, Performance for 100+ Players, Real-time Updates, and Mobile Parity Prep (015)**

**Context:**
014 is complete (full v1 audit of 004-013, fixes applied, docs finalized including SCHEDULER.md and AUDIT.md, milestone committed with clean message referencing the prompts).

The TD wizard + scheduler is now at a solid v1: 5-step wizard with edit, advanced scheduling engine, persistence, DRAW integration, player My Schedule + export, notifications, status locks, etc.

For v2 / production readiness:
- Upgrade the scheduler to a full constraint-based auto-optimizer (using backtracking, scoring, or simple solver to handle complex constraints like min rest across all matches, court balance, player preferences if any, etc.).
- Performance: optimize for 100+ players (e.g., efficient algorithms, pagination in UI, caching computed schedules).
- Real-time: add live updates for schedule changes (using Supabase realtime or polling) so TD and players see updates without refresh.
- Prep for mobile parity: ensure all data models, APIs, and UIs are mobile-friendly or document gaps for Flutter parity (e.g., responsive design, touch-friendly controls, data export for mobile).
- Audit any v1 issues post-commit and fix.

**Goals:**
- Implement advanced auto-scheduler with full constraints and optimization.
- Make it performant and scalable.
- Add real-time schedule sync.
- Polish for mobile/responsive and note parity items.
- Run build, update docs/audit if needed, prepare for next (e.g., full mobile or production deploy).

**Specific tasks:**

1. **Advanced Constraint-Based Auto-Scheduler**
   - Enhance `generateAdvancedSchedule` (or new `generateConstraintOptimizedSchedule`) in flutterParity.ts.
   - Add support for complex constraints:
     - Hard: no player overlaps, respect min_rest between ANY of player's matches (not just consecutive), max_matches_per_day, court availability per slot, lunch buffers.
     - Soft/optimization: balance load across courts/days, prefer higher-rated players in prime slots (if ratings available), minimize back-to-back for same division, seed by registration order or rating.
   - Algorithm: simple backtracking with pruning + scoring heuristic (e.g., assign highest constraint players first, score assignments by utilization/fairness, pick best or retry with variations). For 100+ players, add limits (e.g., max iterations, early exit on good score) or greedy fallback.
   - Input: tournament detail (full wizard data + day_schedules if jsonb), registrations list, optional existing matches (to avoid conflicts).
   - Output: optimized slots with assignments, plus report (e.g., "X conflicts resolved, utilization 85%").
   - Expose in SCHEDULE tab: "Optimize with Full Constraints" button (in addition to basic/advanced).
   - Update payload/storage if new fields needed (e.g., optimization_score).

2. **Performance for 100+ Players**
   - In generate functions: optimize loops (e.g., precompute possible slots, use efficient data structures for player conflicts).
   - UI: paginate large schedule grids (e.g., by day or court), virtualize lists, lazy load registrations in dropdowns.
   - Backend: if generating on server (future), cache results; for now, client-side but warn on large fields.
   - Add "Estimate only" mode that computes capacity/utilization without full assignment.
   - Test mentally: 100 players, 4 courts, 3 days – should complete in reasonable time (<5s?).

3. **Real-time Schedule Updates**
   - Use Supabase Realtime (or polling fallback) to subscribe to changes in tournament_details (schedule_slots) or related matches.
   - In detail page (all tabs, especially SCHEDULE, DRAW, OVERVIEW): on schedule update, refetch or patch local state, show "Schedule updated live" toast.
   - In player My Schedule: similar subscription for the player's tournament.
   - In TD list: optional, or on detail open.
   - Add toggle in tournament settings: "Enable real-time schedule sync" (default on for v2).
   - Handle conflicts gracefully (e.g., last-write-wins or merge notes).

4. **Mobile Parity Prep and Responsive Polish**
   - Make all new/updated UIs responsive: SCHEDULE grid should stack or scroll on mobile, buttons touch-friendly (min 44px), fonts readable.
   - Use existing responsive patterns from wizard/list (e.g., grid-cols-1 sm:grid-cols-2).
   - Add mobile-specific notes in SCHEDULER.md: "Touch-optimized grids; consider Flutter port for native gestures."
   - For player export: ensure ICS works on mobile (tested mentally).
   - If any wizard or detail components not mobile-friendly from prior, spot-fix (e.g., long forms).
   - Document gaps: e.g., "No offline support yet (for mobile parity later)."

5. **Polish, Docs, and Audit Follow-up**
   - Fix any issues from 014 audit that were deferred.
   - Update SCHEDULER.md and AUDIT.md with v2 notes (advanced scheduler, realtime, performance).
   - Add to player tournament page: any missing schedule viz polish.
   - If needed, small migration for new fields (e.g., optimization_score, realtime_enabled).
   - Final verification: full flow with 50+ player sim (hardcode data if no seed), check performance, realtime (describe), mobile viewport (in dev tools).
   - Prepare commit/PR for this chunk: "feat(scheduler): v2 advanced constraints, realtime, mobile prep, performance (prompt 015)".
   - Update build-prompts/README with notes on v1 vs v2.

**Files likely to touch:**
- lib/td/flutterParity.ts (advanced generate with constraints, perf helpers).
- app/td/tournaments/[id]/page.tsx (SCHEDULE enhancements, realtime sub, mobile polish, DRAW sync).
- app/tournament/[id]/page.tsx (player My Schedule polish, realtime).
- app/td/tournaments/new/page.tsx or settings (realtime toggle).
- supabase migrations (if new fields).
- Docs: SCHEDULER.md, AUDIT.md, build-prompts/README.
- Possibly app/td/page.tsx for list updates.

**After you finish:**
Run the build verification:
```bash
cd /home/tb/ai-playground/squash_life_web && npm run build 2>&1 | tail -20
```

Describe a test with simulated large field (e.g., "Generated for 120 players in 2.3s, 92% utilization, no conflicts").

Report back:
- Advanced scheduler summary (constraints handled, algorithm sketch, perf numbers).
- Realtime implementation (subscription setup, UI updates).
- Mobile parity notes and changes.
- Docs/audit updates (key additions).
- Full build output.
- Recommendations for 016 (e.g., "offline support", "full bracket from optimized schedule", "production deploy and monitoring", "player push notifications").

Work from current state. Use search_replace. Follow all prior patterns (styling, helpers, fetch, realtime if used elsewhere, etc.).

If adding fields, provide migration SQL and update all selects/payloads.

Success: Full advanced scheduler with constraints and perf, realtime live updates, mobile-friendly UIs, docs updated, build green, comprehensive report. v2 ready for audit. The scheduler is now production-viable for medium-large tournaments.

Include in report: how this builds on v1 from 014, and any "C2 lessons" from the prompt chain (e.g., incremental prompts helped avoid over-scoping).