**Next Instructions for C2 / Internal Implementer – Start v3 with Mobile App Skeleton or Advanced Features (024)**

**Context:**
023 is complete (v2 production launch executed, post-launch support and monitoring active, v3 planning/roadmap documented with priorities like mobile app, advanced payments, AI scheduling, etc.).

The v2 scheduler is launched and supported. Now start v3 development per the roadmap from 023.

**Goals for this chunk:**
- Choose and start one major v3 feature based on roadmap: e.g. mobile app skeleton (PWA enhancements or separate mobile views), or advanced features like full payments integration or AI-assisted scheduling.
- Implement core of the chosen feature.
- Test, build, report.
- Update roadmap/docs with progress.

**Specific tasks:**

1. **Choose and Implement Core v3 Feature**
   - Option A: Mobile App - Enhance PWA to full mobile app like experience, or add mobile-specific views for TD and players (e.g. responsive wizard on mobile, mobile schedule viewer app-like).
   - Option B: Advanced Features - e.g. full payments (real integration if possible, or deeper simulation with status workflows), or AI scheduling (simple heuristic or mock AI for optimization).
   - Pick based on priorities from 023 roadmap (e.g. start with mobile if high, or payments).
   - Implement core UI/logic, integrate with existing (e.g. use wizard data for mobile views, schedule for AI input).
   - Add tests for new feature.

2. **Test and Verify**
   - E2E test the new feature with existing flows.
   - Run full build and tests.
   - If mobile, test on emulators or responsive.

3. **Docs and Roadmap Update**
   - Update ROADMAP.md with v3 progress (what started, status).
   - Update SCHEDULER.md with new feature docs.
   - Add to AUDIT or notes.

**Files likely to touch:**
- Depends on choice: app/ for mobile views or new components, lib/ for AI logic, etc.
- Docs updates.
- build-prompts/024-... and README.

**After you finish:**
Run the build verification:
```bash
cd /home/tb/ai-playground/squash_life_web && npm run build 2>&1 | tail -20
```

Report back:
- Which v3 feature started and core implemented (summary).
- Testing and verification (e.g. mobile tested on X, or AI sim results).
- Docs/roadmap updates.
- Full build output.
- Recommendations for 025 (e.g. "complete the v3 feature", "start another", "production for v3").

Work from current state. Use search_replace. Follow patterns.

Success: v3 feature core done, tested, build green, docs updated, report for audit. C2/human to review and choose next.