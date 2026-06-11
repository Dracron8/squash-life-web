# Build Prompts for C2 (TD Wizard)

This folder holds the sequential instruction prompts for building the Tournament Director (TD) 5-step wizard in the Next.js app.

## Workflow
- Prompts are numbered (001, 002, ...).
- C2 (external) or internal subagents should work on the highest-numbered prompt.
- After finishing:
  1. Run the exact build verification command at the bottom of the prompt.
  2. Report the build output + a short status + summary of changes.
- The human (or coordinator) will then add the next numbered prompt.

## Current Prompts (as of latest)
- 033-verify-wizard-steps-2-5-and-td-flow.md — (NEW) End-to-end local test of the full 5-step creation wizard (steps 2-5 + SUMMARY review + post-create detail OVERVIEW/SCHEDULE). Run on localhost:3000 after login. C2 + human audit. Includes build check + pass criteria.
- 004-step4-5-day-summary.md — Step 4 (DAY) + Step 5 (SUMMARY) + creation logic + stepper persistence.
- 005-wizard-polish-navigation-creation.md — Clickable stepper navigation, better resumption, robust final creation + redirect, cleanup.
- 006-td-dashboard-and-detail-integration.md — Integrate new tournaments into TD list + build/polish the tournament detail view (OVERVIEW tab) showing wizard data.
- 007-polish-edit-support-schedule-viz.md — Polish end-to-end create/edit flow, add full edit support, enhance schedule visualization in SUMMARY and OVERVIEW to better show day_schedules / blocks. (Completed via internal spawn + direct edits)
- 008-start-scheduling-engine.md — Start the actual scheduling engine: use day_schedules + rules from a tournament + registrations to auto-generate a basic court/time assignment for matches. Add UI in detail page (SCHEDULE tab). Scope to skeleton + basic auto-assign + in-memory for this chunk. (Implemented; build green)
- 009-persist-schedule-and-link-to-matches.md — Persist schedule_slots to tournament_details (JSON), load on page, basic link to create placeholder matches from slots. (Implemented via direct edits; build green)
- 010-deepen-schedule-draw-integration.md — Use persisted slots to create actual matches on generate (insert to matches table), integrate schedule view with DRAW tab (show assigned matches), enhance auto-assign with better player distribution from registrations. Polish UX, handle status-based edit locks. (Implemented)
- 011-finalize-scheduler-draw-sync-and-locks.md — Finalize bidirectional sync (edit slot <-> match), deeper DRAW integration (show schedule times, post-process generate to assign from slots), status locks everywhere, clear schedule button, polish feedback/errors. Prepare for commit. (Implemented)
- 012-commit-milestone-player-schedule-and-polish.md — Commit 004-011 changes as "TD wizard + scheduler v1" milestone. Add player-facing "My Schedule" view in tournament/[id] page. Final polish from recs (Edit Again links, locked messaging, day_schedules fidelity). Full audit report + verification steps. (Implemented)
- 013-advanced-scheduler-notifications-and-v1.md — Upgrade to advanced auto-scheduler with constraints (min rest, max/day, utilization). Add player notifications on schedule changes (email/SMS using td comms). Player calendar export (ICS for My Schedule). v1 polish, docs, audit prep for full milestone. (Implemented)
- 014-finalize-v1-audit-and-commit.md — Self-audit the full scheduler (004-013), fix issues, finalize docs (SCHEDULER.md + AUDIT.md), prepare audit package, and commit as "TD scheduler v1" milestone. Run full verification and report for human/C2 review. (Implemented)
- 015-advanced-constraint-scheduler-performance-and-realtime.md — Upgrade to full constraint-based auto-optimizer, performance for 100+ players, real-time schedule updates (Supabase realtime), mobile/responsive polish and parity prep. Full verification with large sim, update docs. (Implemented)
- 016-mobile-parity-offline-realtime-collab-performance.md — Complete full mobile parity (PWA, offline caching for wizard/schedule), real-time collaboration for schedule editing (multi-TD live sync with conflict resolution), performance optimizations for 100+ players (efficient algos, lazy loading), and production readiness notes. Verify with sims, update docs/audit. (Implemented)
- 017-production-deployment-security-and-monitoring.md — Security hardening (rate limits, logs, auth), deployment/CI/CD setup (Docker, envs, staging), monitoring (logs, metrics, alerts), release docs and final v1 audit/commit. Build, verify deploy sim, report for human/C2. (Implemented)
- 018-full-testing-suite-advanced-analytics-and-production-launch.md — Full testing suite (unit, integration, E2E with coverage), advanced analytics (events, TD dashboard, exports), production launch prep (docs, onboarding, checklist, final polish). Run build+tests, report for audit. (Implemented)
- 019-beta-launch-feedback-and-production-release.md — Beta launch to limited users, collect/integrate feedback, full production release, post-launch monitoring and polish. Run build, report metrics and audit package. (Implemented)
- 020-post-launch-monitoring-feedback-v2-planning.md — Post-launch monitoring (dashboards, alerts), ongoing feedback integration and fixes, v2 roadmap planning (e.g., bracket integration, payments), final docs and audit updates. Run build, report metrics and v2 plan. (Implemented)
- 021-v2-bracket-payments-notifications.md — Start v2: basic bracket generation from schedule, payments support (fee collection simulation), enhanced push notifications. Integrate with DRAW, update docs. Build and report. (Implemented)
- 022-complete-v2-bracket-payments-notifications-testing-and-launch.md — Complete v2 bracket, payments, notifications features fully (end-to-end flows). Add comprehensive testing for v2. Polish and prepare for production launch (docs, onboarding). Run build, report for audit. (Implemented)
- 023-v2-production-launch-post-launch-support-v3-planning.md — v2 production launch (deploy, announce), post-launch support (monitor, feedback), v3 planning (roadmap, priorities). Run build, report metrics and plan. (Implemented)
- 024-v3-start-mobile-app-or-advanced-features.md — Start v3 with mobile app skeleton or advanced features (e.g. full payments or AI scheduling). Choose based on roadmap, implement core, test, update docs. Build and report. (Implemented)
- 025-complete-v3-and-start-next-or-production.md — Complete the v3 feature started in 024 (mobile or advanced), add testing, polish, prepare for production or next. Run build, report. (Implemented)
- 026-v3-production-launch-post-launch-support-v4-planning.md — v3 production launch (deploy, announce), post-launch support (monitor, feedback), v4 planning (roadmap, priorities). Run build, report metrics and plan. (Implemented)
- 027-v4-start-mobile-app-payments-ai-scheduling.md — Start v4 with mobile app skeleton or advanced features (e.g. full payments or AI scheduling). Choose based on roadmap, implement core, test, update docs. Build and report. (Implemented)
- 028-complete-v4-and-prep-v5-or-production.md — Complete the v4 feature, add testing, polish, prepare for production or v5. Run build, report. (Implemented)
- 029-v4-production-launch-post-launch-support-v5-planning.md — v4 production launch (deploy, announce), post-launch support (monitor, feedback), v5 planning (roadmap, priorities). Run build, report metrics and plan. (Implemented)
- 030-v5-start-mobile-app-or-advanced-features.md — Start v5 with mobile app skeleton or advanced features (e.g. full payments or AI scheduling). Choose based on roadmap, implement core, test, update docs. Build and report. (Implemented)
- 031-complete-v5-and-start-next-or-production.md — Complete the v5 feature started in 030 (mobile or advanced), add testing, polish, prepare for production or next. Run build, report. (Implemented)
- 032-v5-production-launch-post-launch-support-v6-planning.md — (NEXT) v5 production launch (deploy, announce), post-launch support (monitor, feedback), v6 planning (roadmap, priorities). Run build, report metrics and plan.

## Naming
- Use NNN-short-description.md for new prompts.
- Update this README when adding new ones.

Last updated: 2026-06-07
