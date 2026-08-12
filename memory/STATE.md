# CURRENT STATE
## Rewritten every run. A snapshot of NOW, not a history.
## Last updated: 2026-08-12

## WHAT'S BUILT
A working Next.js 16 + Supabase squash-tournament web app. In the codebase:
- Auth: login, signup modal, reset-password, auth callback (Supabase SSR)
- Tournament-director (td) area: dashboard, tournament create/detail,
  scheduling + draw generation (lib/td/drawGenerator.ts, flutterParity.ts)
- Public: tournaments list, tournament detail, player profile, dashboard
- Data: squash_clubs.json; fuse.js search; Supabase backend (supabase/)
- 31 build-prompts/ documenting the build history (v1 through v5+)

## WHAT EXISTS (infra)
- Next.js 16.2.6, React 19.2, Tailwind 4, TypeScript; @supabase/ssr
- Supabase project ref lbffnhxwvkzogsywydcd (region us-east-2), STATUS: Healthy
- Branches: main (default) + this run's claude/supabase-network-verify-urhmz0
- .github/workflows/keep-supabase-warm.yml: pings REST every ~3 days to stop
  the Free-plan project auto-pausing. Tested green on GitHub's runner. The cron
  only fires from the DEFAULT branch, so it activates once merged to main.

## NEXT TASK
[Awaiting Tom's direction for SqshLife.] Runtime is now proven end-to-end, so
feature work can proceed and be verified live.

## BLOCKED ON
Nothing.

## VERIFIED THIS RUN (see VERIFIED.md for proof)
- Supabase reachable: auth/v1/health -> HTTP 200. Prior "blocked" state was a
  PAUSED project (now unpaused), NOT the egress allowlist.
- `npm ci` + `npm run build` -> exit 0 (12/12 pages). `npm run lint` -> 0
  errors, 15 cosmetic warnings.
- Runtime end-to-end (headless Chromium + curl replay of client calls):
  /tournaments and /tournament/[id] SSR real Supabase data; /login renders
  and reaches Supabase auth (invalid creds -> correct 400 "Invalid login
  credentials"); / redirects to /login when unauthenticated. Zero dev-server
  runtime errors.

## UNVERIFIED / GAPS
- No authenticated-session flows tested (no real credentials): TD dashboard,
  tournament create/edit, registration writes, and RLS-protected reads behind
  login are UNVERIFIED. Would need a test account (or a service-role seed).
- In-browser client calls to *.supabase.co could not be exercised from the
  headless test browser (no proxied egress); proven instead by replaying the
  exact supabase-js calls with the anon key. Real user browsers hit Supabase
  directly, so this is a harness limit, not an app gap.
- 15 lint warnings (no-img-element / no-page-custom-font / unused-vars) left
  as-is — cosmetic/perf.
- 6 high npm-audit vulnerabilities (transitive) — not investigated.
