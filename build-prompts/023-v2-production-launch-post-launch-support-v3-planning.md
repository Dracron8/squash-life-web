**Next Instructions for C2 / Internal Implementer – v2 Production Launch, Post-Launch Support, and v3 Planning (023)**

**Context:**
022 is complete (v2 bracket, payments, notifications features fully implemented with end-to-end flows, comprehensive testing added, launch prep with docs and onboarding, build green).

The scheduler has v2 features: brackets from schedule, payments simulation, notifications.

Now launch v2 to production, support post-launch, and plan v3.

**Goals for this chunk:**
- Execute v2 production launch (deploy, announce, monitor).
- Post-launch support: monitor, handle issues, gather feedback.
- v3 planning: document roadmap with priorities from feedback and recs (e.g., full mobile app, advanced payments, AI scheduling).
- Run build, report.

**Specific tasks:**

1. **v2 Production Launch**
   - Deploy the v2 changes (use previous deploy scripts).
   - Announce: update site, email users, social if applicable.
   - Monitor launch: check analytics, errors, usage of new features (brackets, payments, notifs).
   - Verify: test create -> schedule -> bracket -> pay -> notify end-to-end in prod.

2. **Post-Launch Support**
   - Set up monitoring for v2 features.
   - Handle initial issues: bug fixes if reported.
   - Collect early feedback on v2 features.
   - Update docs with any launch notes.

3. **v3 Planning**
   - Update ROADMAP.md with v3 priorities from feedback and recs (e.g., 1. Full mobile app, 2. Advanced payments, 3. AI optimizer, 4. Real-time push).
   - Prioritize 2-3 items for 024+.
   - Add to docs.

4. **Polish and Verification**
   - Any final v2 polish.
   - Full build and tests.
   - Prepare report with launch metrics, feedback, v3 plan.

**Files likely to touch:**
- Deployment configs if needed.
- Docs: ROADMAP.md, SCHEDULER.md updates, launch notes.
- Minor code if polish needed.
- build-prompts/023-... and README.

**After you finish:**
Run the build verification:
```bash
cd /home/tb/ai-playground/squash_life_web && npm run build 2>&1 | tail -20
```

Report back:
- Launch execution summary (deploy, announce, initial metrics).
- Post-launch support (monitoring, issues handled).
- v3 roadmap (key items).
- Full build output.
- Recommendations for 024 (e.g., "start mobile app", "full payments", "AI scheduling").

Work from current state. Use search_replace. Follow patterns.

Success: v2 launched, support active, v3 planned, build green, report for audit. C2/human to review.