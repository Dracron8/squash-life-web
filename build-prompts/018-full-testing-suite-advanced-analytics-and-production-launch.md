**Next Instructions for C2 / Internal Implementer – Full Testing Suite, Advanced Analytics, and Production Launch Prep (018)**

**Context:**
017 is complete (security hardening, deployment/CI/CD setup, monitoring, release docs, final v1 audit/commit prep).

The TD wizard + scheduler is now production-ready in code: full features from 004-016, hardened, deployable, monitored.

Time for:

- Comprehensive testing: unit, integration, E2E for all major flows (wizard steps, schedule gen, edit, notifications, player views, realtime if added).
- Advanced analytics: usage tracking (e.g., wizard completion rates, schedule gen frequency, player engagement), performance metrics (gen times, load), error logging integration.
- Production launch prep: final docs, beta testing notes, launch checklist, user onboarding, any last polish from audit recs.

**Goals for this chunk:**
- Implement a solid testing harness (Jest for units, Cypress/Playwright for E2E, coverage reports).
- Add analytics hooks (e.g., simple event logging to a table or external like PostHog, dashboard in TD settings).
- Polish for launch: update all docs, add onboarding tour or help, final UX tweaks, prepare for real users (e.g., email templates, support links).
- Run full verification (build + tests + sims), produce launch report.

**Specific tasks:**

1. **Full Testing Suite**
   - Set up Jest + React Testing Library for unit/integration tests on key components (wizard form, schedule generator, overview cards, etc.).
   - Add E2E tests (e.g., with Playwright or Cypress): full wizard flow (create tournament with schedule), edit, generate advanced schedule, player view/export, notifications trigger.
   - Test coverage: aim >80% for scheduler-related code.
   - Include edge cases: large fields (100+ players), no regs, status transitions, realtime conflicts.
   - Add test scripts to package.json, run in CI (from 017 deploy).
   - Mock Supabase where needed for isolated tests.

2. **Advanced Analytics**
   - Add event tracking: e.g., wizard step completions, schedule generate (with params like #days, #players), edit actions, player views/exports, notification sends.
   - Store in a simple `analytics_events` table or Supabase (with timestamp, event_type, metadata, user_id if applicable).
   - TD dashboard: add a simple "Analytics" tab or section (charts via Recharts or similar, or basic tables: gen count, avg time, popular formats).
   - Player side: optional anonymous usage (e.g., schedule views).
   - Privacy: anonymize where possible, respect user data.
   - Export: button to download CSV of events for the tournament.

3. **Production Launch Prep and Polish**
   - Update all docs: SCHEDULER.md with launch notes, known limits, support contacts; AUDIT.md with final sign-off; add CHANGELOG.md entry for v1.
   - Onboarding: simple help modal or tooltip tour in wizard (e.g., "Step 1: Define your club..."), or a "Getting Started" guide linked from TD list.
   - UX polish from recs: any deferred items like better empty states, confirmations, mobile tweaks if missed in 016.
   - Launch checklist: env vars documented, monitoring alerts set, beta user invites (if applicable), rollback plan.
   - If realtime added: test multi-user collab in staging.
   - Final audit follow-up: address any open items from 017 report, e.g., performance benchmarks with real data.

**Files likely to touch:**
- package.json (test scripts, analytics deps if any).
- __tests__/ or e2e/ folders (new test files for wizard, scheduler, etc.).
- app/td/ components (analytics UI in settings or new tab, event logging hooks).
- lib/ (analytics client, test utils).
- Docs: SCHEDULER.md, AUDIT.md, CHANGELOG.md, perhaps new LAUNCH.md or ONBOARDING.md.
- Any remaining code polish in wizard/detail pages.

**After you finish:**
Run the build verification + tests:
```bash
cd /home/tb/ai-playground/squash_life_web && npm run build 2>&1 | tail -20
npm test -- --coverage  # or whatever the test command is
```

Simulate a full launch flow: create tournament, generate schedule, check analytics, test player export, etc. (describe in report).

Report back:
- Testing suite summary (coverage %, key E2E flows covered, any bugs found/fixed).
- Analytics features (events tracked, dashboard UI description).
- Launch prep (docs updates, checklist status).
- Full build + test output.
- Recommendations for 019 (e.g., "beta launch with real users", "advanced analytics dashboard", "full mobile app parity", "performance at scale").

Work from current state (post-017). Use search_replace for code, write for new tests/docs. Follow all prior patterns (styling, helpers, Supabase, etc.).

If adding test deps, note in report and update package.json.

Success: Comprehensive tests passing with good coverage, analytics live in TD UI, docs/launch prep complete, build + tests green, detailed report for human/C2 final review. The scheduler is now fully tested, measurable, and launch-ready.

Include in report: how the entire prompt chain (004-018) systematically built this from wizard to production v1, and any meta-lessons for future projects.