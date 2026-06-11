**Next Instructions for C2 / Internal Implementer – Start v4 with Mobile App Skeleton or Advanced Features (027)**

**Context:**
026 is complete (v3 production launch, post-launch support, v4 planning with priorities like mobile app, payments, AI scheduling).

The v3 scheduler is launched. Now start v4 development per the roadmap.

**Goals for this chunk:**
- Choose and start one or more v4 features based on roadmap: e.g., mobile app skeleton, full payments integration, AI-assisted scheduling.
- Implement core of the chosen feature(s).
- Test, build, report.
- Update roadmap/docs with progress.

**Specific tasks:**

1. **Choose and Implement Core v4 Feature**
   - Option A: Mobile App - Enhance PWA or add mobile-specific views for TD and players (e.g., responsive wizard on mobile, mobile schedule viewer app-like).
   - Option B: Payments - Full integration (e.g., real payment flows if possible, deeper status workflows).
   - Option C: AI Scheduling - Simple AI/heuristic for optimization (e.g., better distribution, conflict resolution).
   - Pick based on priorities (e.g., start with mobile or payments).
   - Implement core UI/logic, integrate with existing (wizard, schedule, etc.).
   - Add tests for new feature.

2. **Test and Verify**
   - E2E test the new feature with existing flows.
   - Run full build and tests.

3. **Docs and Roadmap Update**
   - Update ROADMAP.md with v4 progress (what started, status).
   - Update SCHEDULER.md with new feature docs.
   - Add to AUDIT or notes.

**Files likely to touch:**
- Depends on choice: app/ for mobile or features, lib/, docs, tests.
- build-prompts/027-... and README.

**After you finish:**
Run the build verification:
```bash
cd /home/tb/ai-playground/squash_life_web && npm run build 2>&1 | tail -20
```

Report back:
- Which v4 feature started and core implemented (summary).
- Testing and verification.
- Docs/roadmap updates.
- Full build output.
- Recommendations for 028 (e.g., "complete the v4 feature", "start another", "production for v4").

Work from current state. Use search_replace. Follow patterns.

Success: v4 feature core done, tested, build green, docs updated, report for audit. C2/human to review.