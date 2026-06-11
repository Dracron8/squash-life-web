**Next Instructions for C2 / Internal Implementer – Post-Launch Monitoring, Feedback Integration, and v2 Planning (020)**

**Context:**
019 is complete (beta launch executed, feedback collected and integrated with fixes, full production release, post-launch monitoring started, launch report generated).

The scheduler v1 is now live in production: users can create/edit tournaments, generate advanced schedules, players see/export their schedules, notifications sent, etc.

Now focus on sustaining and evolving:

- Monitoring: set up ongoing dashboards, alerts for usage/errors/performance.
- Feedback: continue collecting, prioritize and implement high-value items into v1.1.
- v2 Planning: document roadmap based on feedback and original goals (e.g., full bracket integration, payments, advanced constraints, mobile app).
- Polish: any final v1.1 items, update docs, prepare for next cycle.

**Goals for this chunk:**
- Implement production monitoring (dashboards, alerts via existing or new tools).
- Integrate ongoing feedback (triage, fix 2-3 top items, update tests/docs).
- Plan v2: create ROADMAP.md with prioritized features from feedback/audit recs.
- Final v1 polish and docs update.
- Run build, report metrics from post-launch, and the v2 plan.

**Specific tasks:**

1. **Post-Launch Monitoring**
   - Set up analytics dashboard (build on 018 advanced analytics): real-time views for active tournaments, schedule gen rate, error rates, user growth.
   - Add alerts: e.g., if schedule gen fails >5% or latency >5s, notify TD team (email or in-app).
   - Logging: enhance error logging for scheduler/wizard (integrate with monitoring tool like Sentry if set up in 017).
   - Metrics: track key KPIs (e.g., % of tournaments with schedule generated, player schedule views, notification open rates).
   - Dashboard UI: add to TD settings or new /td/analytics page (simple charts with Recharts or similar, or tables).

2. **Ongoing Feedback Integration**
   - Continue feedback collection (from 019 in-app form or email).
   - Triage: categorize new feedback (bugs, features, UX).
   - Implement top items: e.g., if feedback on slow gen for large fields, optimize (tie to 016 perf); if UX issue in player view, polish; fix any bugs reported.
   - Update tests: add regression tests for fixed issues.
   - Docs: update SCHEDULER.md with "Known Issues" or "Recent Updates" section.
   - If major, loop to previous code areas (e.g., re-enhance schedule viz or engine).

3. **v2 Planning and Roadmap**
   - Create ROADMAP.md (in root or docs/): 
     - v1 summary (what shipped in 004-019).
     - v2 priorities based on feedback/audit (e.g., 1. Full auto-bracket from optimized schedule, 2. Player payments/waitlist automation, 3. Advanced constraints solver, 4. Mobile app or PWA enhancements, 5. Real-time notifications push, 6. Analytics for players).
     - Timeline estimate (e.g., Q3 for v2.0).
     - Stretch goals (e.g., AI-assisted scheduling, integration with external calendars).
   - Prioritize 2-3 items for 021+ prompts.
   - Update AUDIT.md with post-launch notes.

4. **Final Polish**
   - Any deferred from 019: e.g., "advanced analytics dashboard" full features if partial, onboarding tour if not complete, production monitoring alerts.
   - Docs: finalize all (SCHEDULER, AUDIT, ROADMAP, DEPLOY, etc.), add v1 release notes.
   - Small UX: if feedback points to quick wins, implement (e.g., better empty states in SCHEDULE tab).
   - Prepare for next: stub out 021 prompt ideas in build-prompts or notes.

**Files likely to touch:**
- app/td/ (new analytics page or section, feedback triage UI if admin).
- Components for charts/metrics.
- Docs: ROADMAP.md, updates to SCHEDULER.md/AUDIT.md/CHANGELOG.md.
- lib/ for any analytics or monitoring helpers.
- Possibly package.json for new chart libs if needed.

**After you finish:**
Run the build verification:
```bash
cd /home/tb/ai-playground/squash_life_web && npm run build 2>&1 | tail -20
```

Report post-launch metrics (e.g., "Beta: 50 tournaments created, 200 schedules generated, avg feedback 4.5/5, 2 bugs fixed").

Report back:
- Monitoring setup (dashboards, alerts, metrics tracked).
- Feedback integrated (top 3 items + fixes).
- v2 roadmap (key sections or paste outline).
- Full build output.
- Audit/launch package updates (final summary, v1 success metrics).
- Recommendations for 021 (e.g., "start v2 with bracket integration", "add payments", "scale testing").

Work from current state (post-019). Use search_replace for code, write for new docs. Follow patterns.

If adding analytics libs, note and keep simple (use existing or plain JS).

Success: Production monitoring live, feedback loop active with fixes, clear v2 roadmap, build green, comprehensive report. v1 is launched and evolving. The scheduler is a real product.

Include in report: reflection on the full prompt series (004-020) building this from zero to production, and how the incremental approach + audits ensured quality. Ready for human/C2 final review and ongoing development.