**Next Instructions for C2 / Internal Implementer – v3 Production Launch, Post-Launch Support, and v4 Planning (026)**

**Context:**
025 is complete (v3 feature completed from 024 choice, testing added, launch prep or next started, build green).

The v3 is ready for production.

Now launch v3, support post-launch, plan v4.

**Goals for this chunk:**
- Execute v3 production launch (deploy, announce, monitor).
- Post-launch support: monitor, handle issues, gather feedback.
- v4 planning: document roadmap with priorities from feedback and recs (e.g., full mobile app, advanced payments, AI scheduling).
- Run build, report.

**Specific tasks:**

1. **v3 Production Launch**
   - Deploy the v3 changes (use previous deploy scripts).
   - Announce: update site, email users, social if applicable.
   - Monitor launch: check analytics, errors, usage of new v3 features.
   - Verify: test the v3 flows end-to-end in prod.

2. **Post-Launch Support**
   - Set up monitoring for v3 features.
   - Handle initial issues: bug fixes if reported.
   - Collect early feedback on v3 features.
   - Update docs with any launch notes.

3. **v4 Planning**
   - Update ROADMAP.md with v4 priorities from feedback and recs (e.g., 1. Full mobile app, 2. Advanced payments, 3. AI optimizer, 4. Real-time push).
   - Prioritize 2-3 items for 027+.
   - Add to docs.

4. **Polish and Verification**
   - Any final v3 polish.
   - Full build and tests.
   - Prepare report with launch metrics, feedback, v4 plan.

**Files likely to touch:**
- Deployment configs if needed.
- Docs: ROADMAP.md, SCHEDULER.md updates, launch notes.
- Minor code if polish needed.
- build-prompts/026-... and README.

**After you finish:**
Run the build verification:
```bash
cd /home/tb/ai-playground/squash_life_web && npm run build 2>&1 | tail -20
```

Report back:
- Launch execution summary (deploy, announce, initial metrics).
- Post-launch support (monitoring, issues handled).
- v4 roadmap (key items).
- Full build output.
- Recommendations for 027 (e.g., "start mobile app", "full payments", "AI scheduling").

Work from current state. Use search_replace. Follow patterns.

Success: v3 launched, support active, v4 planned, build green, report for audit. C2/human to review.