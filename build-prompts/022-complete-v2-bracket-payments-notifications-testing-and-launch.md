**Next Instructions for C2 / Internal Implementer – Complete v2 Bracket, Payments, Notifications, Testing, and Launch (022)**

**Context:**
021 is complete (basic v2 bracket generation from schedule, payments support simulation, enhanced push notifications, integration with DRAW, docs updates).

The scheduler has v2 features started: brackets, payments, notifs.

Now complete the v2 features, add full testing, and prepare for launch.

**Goals for this chunk:**
- Complete the bracket, payments, notifications features fully (end-to-end flows).
- Add comprehensive testing for v2 features.
- Polish and prepare for production launch (docs, onboarding, etc.).
- Run build, report.

**Specific tasks:**

1. **Complete v2 Features**
   - Finish bracket generation: full integration, display in DRAW, editing.
   - Payments: full flow simulation, status updates, integration with reg.
   - Notifications: full push/email, triggers on bracket/payments.
   - Tie together: schedule -> bracket -> payments -> notifs.

2. **Comprehensive Testing**
   - Unit tests for new helpers (bracket gen, payments logic, notif senders).
   - Integration/E2E: full v2 flow (create with schedule -> gen bracket -> pay -> notify -> view).
   - Coverage for new code.
   - Add to CI if applicable.

3. **Launch Prep**
   - Update docs with v2 features.
   - Onboarding for new features.
   - Any final polish from feedback.
   - Prepare release notes.

**Files likely to touch:**
- lib/td/flutterParity.ts (bracket helpers)
- app/td/tournaments/[id]/page.tsx (DRAW, SCHEDULE enhancements, payments UI)
- app/tournament/[id]/page.tsx (player payments, bracket view, notifs)
- app/td/tournaments/new/page.tsx (minor)
- Tests: new test files.
- Docs: updates.

**After you finish:**
Run the build verification:
```bash
cd /home/tb/ai-playground/squash_life_web && npm run build 2>&1 | tail -20
```

Report back:
- Summary of completed v2 features.
- Testing added (coverage, key tests).
- Launch prep (docs, etc.).
- Full build output.
- Recommendations for 023 (e.g., "production launch", "advanced features", "mobile app").

Work from current state. Use search_replace. Follow patterns.

Success: v2 features complete and tested, build green, report for audit. C2/human to review.