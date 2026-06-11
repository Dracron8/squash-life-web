**Next Instructions for C2 / Internal Implementer – v4 Production Launch, Post-Launch Support, and v5 Planning (029)**

**Context:**
028 is complete (v4 feature completed from 027 choice, testing added, launch prep or next started, build green).

The v4 is ready for production.

Now launch v4, support post-launch, plan v5.

**Goals for this chunk:**
- Execute v4 production launch (deploy, announce, monitor).
- Post-launch support: monitor, handle issues, gather feedback.
- v5 planning: document roadmap with priorities from feedback and recs (e.g., full mobile app, advanced payments, AI scheduling).
- Run build, report.

**Specific tasks:**

1. **v4 Production Launch**
   - Deploy the v4 changes (use previous deploy scripts).
   - Announce: update site, email users, social if applicable.
   - Monitor launch: check analytics, errors, usage of new v4 features.
   - Verify: test the v4 flows end-to-end in prod.

2. **Post-Launch Support**
   - Set up monitoring for v4 features.
   - Handle initial issues: bug fixes if reported.
   - Collect early feedback on v4 features.
   - Update docs with any launch notes.

3. **v5 Planning**
   - Update ROADMAP.md with v5 priorities from feedback and recs (e.g., 1. Full mobile app, 2. Advanced payments, 3. AI optimizer, 4. Real-time push).
   - Prioritize 2-3 items for 030+.
   - Add to docs.

4. **Polish and Verification**
   - Any final v4 polish.
   - Full build and tests.
   - Prepare report with launch metrics, feedback, v5 plan.

**Files likely to touch:**
- Deployment configs if needed.
- Docs: ROADMAP.md, SCHEDULER.md updates, launch notes.
- Minor code if polish needed.
- build-prompts/029-... and README.

**After you finish:**
Run the build verification:
```bash
cd /home/tb/ai-playground/squash_life_web && npm run build 2>&1 | tail -20
```

Report back:
- Launch execution summary (deploy, announce, initial metrics).
- Post-launch support (monitoring, issues handled).
- v5 roadmap (key items).
- Full build output.
- Recommendations for 030 (e.g., "start mobile app", "full payments", "AI scheduling").

Work from current state. Use search_replace. Follow patterns.

Success: v4 launched, support active, v5 planned, build green, report for audit. C2/human to review.