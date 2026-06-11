**Next Instructions for C2 / Internal Implementer – Complete v4 and Prep for v5 or Production (028)**

**Context:**
027 is complete (started v4 with mobile app skeleton or advanced features like full payments or AI scheduling, implemented core, tested, updated docs, build green).

The v4 has core started.

Now complete the v4 feature, add testing, polish, prepare for production or v5.

**Goals for this chunk:**
- Complete the v4 feature started in 027.
- Add testing, polish.
- Prepare for production or start v5.
- Run build, report.

**Specific tasks:**

1. **Complete v4 Feature**
   - Depending on choice in 027:
     - If mobile: complete the skeleton to functional mobile views or PWA enhancements.
     - If advanced: complete the feature (e.g., full payments flow, AI scheduling logic).
   - Integrate fully with existing.
   - Add tests.

2. **Testing and Polish**
   - E2E and unit tests for v4.
   - Polish UX, fix issues.
   - Update docs with v4 details.

3. **Launch Prep or Next**
   - If launching v4: deploy prep, announce.
   - Or start planning 029 based on roadmap.

**Files likely to touch:**
- Depends on choice: app/ for mobile or features, lib/, docs, tests.
- build-prompts/028-... and README.

**After you finish:**
Run the build verification:
```bash
cd /home/tb/ai-playground/squash_life_web && npm run build 2>&1 | tail -20
```

Report back:
- Which v4 feature completed and summary.
- Testing added.
- Launch prep or next plan.
- Full build output.
- Recommendations for 029 (e.g., "start next v4 item", "production for v4", "full launch").

Work from current state. Use search_replace. Follow patterns.

Success: v4 feature complete and tested, build green, report for audit. C2/human to review.