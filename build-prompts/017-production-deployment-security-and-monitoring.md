**Next Instructions for C2 / Internal Implementer – Production Deployment, Security Hardening, Monitoring, and v1 Release Prep (017)**

**Context:**
016 is complete (full mobile parity with PWA/offline, real-time collaboration for schedule editing with conflict resolution, performance optimizations for large fields, and production readiness notes).

The TD scheduler is now feature-complete for v1 in dev: wizard, advanced scheduling, player views, realtime, mobile support.

Time to productionize:
- Security: auth hardening, rate limits, input sanitization, audit logs.
- Deployment: env config, Docker/CI, secrets, staging/prod.
- Monitoring: logging, error tracking, performance metrics, uptime.
- Release: docs, changelog, migration guide, final audit.
- Any final polish from previous recs.

**Goals:**
- Harden security for production.
- Set up deployment pipeline and configs.
- Add monitoring and observability.
- Prepare release docs and audit.
- Verify build and basic deploy simulation.

**Specific tasks:**

1. **Security Hardening**
   - Review all API calls, forms, inputs for sanitization (use existing Supabase RLS, add client-side validation where missing).
   - Add rate limiting (e.g., via Supabase or middleware for wizard/schedule gen endpoints).
   - Audit logs: log schedule changes, edits, notifications (simple table or Supabase logs).
   - Auth: ensure all TD pages use proper role checks (beyond current), add 2FA notes if needed.
   - Secrets: move any hardcoded to env vars (e.g., in next.config or Vercel).
   - XSS/CSRF: ensure headers, use Next.js protections.

2. **Deployment and CI/CD**
   - Add Dockerfile or Vercel config if not present.
   - Env vars: document all (Supabase URL/key, email keys for notifications, etc.) in .env.example.
   - CI: basic GitHub Actions or note for build/test on push.
   - Staging: instructions for deploy to Vercel/Netlify with prod-like DB.
   - Prod checklist: domain, SSL, backups, scaling notes for 100+ players.

3. **Monitoring and Observability**
   - Add logging: use console or Sentry-like for errors in wizard/schedule gen.
   - Metrics: track schedule gen time, user actions (simple analytics hook).
   - Uptime: recommend external monitor (e.g., UptimeRobot for the app).
   - Alerts: for failed schedule gens or high load.
   - Dashboard: simple admin page or note for viewing logs/schedules.

4. **Release and Audit Prep**
   - Update SCHEDULER.md with production notes, security, deploy.
   - AUDIT.md: final v1 audit summary, security review, performance benchmarks from 016 sims, open issues for 018.
   - Changelog: add v1 release notes.
   - Migration guide: from previous wizard versions.
   - Final verification: full build, lint, type check; simulate deploy (e.g., build for prod).

**Files likely to touch:**
- Various: next.config.js, .env.example, package.json scripts, app/api or middleware for rate limits.
- New: Dockerfile, .github/workflows/ci.yml (or notes), SECURITY.md, DEPLOY.md.
- Updates to SCHEDULER.md, AUDIT.md, build-prompts/README.
- app/td/* for any security headers or logging.

**After you finish:**
Run the build verification:
```bash
cd /home/tb/ai-playground/squash_life_web && npm run build 2>&1 | tail -20
```

Also run `npm run lint` or type check if available.

Report back:
- Security changes summary.
- Deploy and monitoring setup (configs, docs).
- Audit/release package (key sections).
- Build output and any CI notes.
- Recommendations for 018 (e.g., "full testing suite", "advanced analytics", "production launch").

Work from current state. Use search_replace for code, write for new docs/configs. Follow patterns.

If adding new deps (e.g., for logging), note them.

Success: Production-ready v1 with security, deploy docs, monitoring, build green, full report. Ready for human/C2 final audit and launch.

Include in report: how the prompt chain (004-017) led to this complete scheduler, and any "C2 lessons" like incremental development helped avoid scope creep.