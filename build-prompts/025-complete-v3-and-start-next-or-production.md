**Next Instructions for C2 / Internal Implementer – Complete v3 Mobile or Advanced Features, Testing, and Launch Prep (025)**

**Context:**
024 is complete (started v3 with choice of mobile app skeleton or advanced features like full payments or AI scheduling, implemented core, tested, updated docs).

The v3 has begun.

Now complete the chosen v3 feature, add testing, and prep for launch or next.

**Goals for this chunk:**
- Complete the core v3 feature started in 024.
- Add comprehensive testing for v3.
- Polish and prepare for production or next (docs, onboarding if applicable).
- Run build, report.

**Specific tasks:**

1. **Complete v3 Feature**
   - Depending on choice in 024:
     - If mobile: complete the skeleton to functional mobile views or PWA enhancements for TD and player (e.g., full wizard on mobile, schedule viewer app-like).
     - If advanced: complete the feature (e.g., full payments flow, AI scheduling logic).
   - Integrate fully with existing (wizard, schedule, etc.).
   - Add tests for the feature.

2. **Testing and Polish**
   - E2E and unit tests for v3.
   - Polish UX, fix issues.
   - Update docs with v3 details.

3. **Launch Prep or Next**
   - If launching v3: deploy prep, announce.
   - Or start planning 026 based on roadmap.

**Files likely to touch:**
- Depends on choice: app/ for mobile or features, lib/, docs, tests.
- build-prompts/025-... and README.

**After you finish:**
Run the build verification:
```bash
cd /home/tb/ai-playground/squash_life_web && npm run build 2>&1 | tail -20
```

Report back:
- Which v3 feature completed and summary.
- Testing added.
- Launch prep or next plan.
- Full build output.
- Recommendations for 026 (e.g., "start next v3 item", "production for v3", "full launch").

Work from current state. Use search_replace. Follow patterns.

Success: v3 feature complete and tested, build green, report for audit. C2/human to review.