**Next Instructions for C2 / Internal Implementer – Beta Launch, Feedback Integration, and Production Release (019)**

**Context:**
018 is complete (full testing suite with coverage, advanced analytics dashboard and event tracking, production launch prep with docs, onboarding, checklist).

The TD scheduler v1 is tested, measurable, docs ready, deploy scripts in place.

Now execute the launch:

- Beta: soft launch to limited users (e.g., 5-10 TDs), monitor via analytics and logs.
- Feedback: collect (in-app form or email), triage, implement fixes/polish.
- Production: full release, announce, monitor, support.
- Final polish: any last items from audit or tests.

**Goals:**
- Run beta phase: deploy to staging/prod with beta flag, invite users, gather data/feedback.
- Integrate feedback: fix bugs, add quick wins, update tests/docs.
- Launch: remove beta, full production, marketing (if any), post-launch review.
- Report: metrics from beta, changes made, launch status, recommendations for 020 (e.g., v2 features like advanced brackets, mobile app, payments).

**Specific tasks:**

1. **Beta Launch Setup and Execution**
   - Deploy the app (use 017 deploy scripts) to a beta env or with feature flag (e.g., BETA_MODE=true hides some features or limits users).
   - Create beta signup/invite system: simple form or admin tool to whitelist TD emails, send invite links.
   - Onboard beta users: email with getting started guide (from docs), link to wizard.
   - Monitor: use analytics (from 018) to track wizard usage, schedule gens, errors. Set up alerts for high error rates.
   - Collect feedback: add in-app feedback modal (e.g., "How was your tournament setup? Rate 1-5, comments"), or email to a support address. Log to a feedback table or Google form.
   - Run for 1-2 weeks (simulate in report): create sample tournaments, generate schedules, view as players.

2. **Feedback Integration**
   - Triage feedback: categorize (bugs, UX, features), prioritize (P0 crashes, P1 UX, P2 nice-to-haves).
   - Implement fixes: e.g., if wizard step confusing, add tooltips; if schedule gen slow, optimize (from 016 perf work); bug fixes in code.
   - Update tests: add test cases for reported bugs.
   - Update docs: incorporate feedback into SCHEDULER.md or FAQ.
   - If major issues, loop back to previous prompts' code (e.g., re-polish schedule viz).

3. **Production Release**
   - Remove beta flags, full deploy to prod.
   - Announce: update landing page or send emails to all TDs (use existing td_email).
   - Marketing: if applicable, social posts or blog about "New TD Scheduler v1 – build and schedule your tournaments easier".
   - Support: set up helpdesk or email monitoring for launch issues.
   - Monitor post-launch: analytics spikes, error rates, user signups/usage for first week.
   - Post-launch review: 1-week check-in metrics (e.g., 50+ tournaments created, avg schedule gen time <2s, 4.5/5 feedback).

4. **Final Polish and Reporting**
   - Any deferred items: e.g., from 018 "advanced analytics dashboard" if not fully done, or mobile tweaks.
   - Full audit sign-off: update AUDIT.md with beta results, all fixes, "v1 approved for production".
   - Prepare 020 recs: e.g., "v2: full bracket auto-gen from schedule, player payments integration, mobile app, advanced constraints solver".
   - Commit any last changes with message referencing 019.

**Files likely to touch:**
- app/ (add feedback modal, beta flag logic, announcement banner).
- lib/ or components for analytics events during beta.
- Docs: SCHEDULER.md, AUDIT.md, new BETA_REPORT.md or section.
- Possibly .env or deploy scripts for beta/prod.
- build-prompts/019-... (this) and README.

**After you finish:**
Run the build verification:
```bash
cd /home/tb/ai-playground/squash_life_web && npm run build 2>&1 | tail -20
```

Simulate/report beta metrics and feedback integration (e.g., "Beta: 8 TDs created 25 tournaments, 3 bugs fixed, feedback avg 4.2/5").

Report back:
- Beta execution summary (users, tournaments, issues found).
- Feedback integrated (list top items and fixes).
- Production launch status (live URL if any, announcement).
- Full build output.
- Audit/launch package (summary, metrics, open items for 020).
- Recommendations for 020 (e.g., "v2 features", "scale testing", "monetization").

Work from current state (post-018). Use search_replace for code, write for docs. Follow patterns.

If beta requires real emails or external services, mock or note (e.g., "use console.log for notifications in sim").

Success: Beta run, feedback looped in, production launched, build green, full report with metrics and v2 roadmap. The scheduler is now live and audited by human/C2.

Include in report: reflection on the entire prompt series (004-019) building this from scratch to production, and how C2's implementation + audits ensured quality.