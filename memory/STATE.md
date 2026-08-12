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
- Supabase project ref: lbffnhxwvkzogsywydcd (URL + anon key in next.config.ts)

## NEXT TASK
Runtime / end-to-end test against Supabase — BLOCKED (see below). Once the
allowlist is fixed and Supabase is reachable: npm ci -> build -> lint ->
`npm run dev` + headless Chromium to exercise homepage, /tournaments,
tournament detail, /login against live Supabase; record what data loads.

## BLOCKED ON
Egress policy still blocks ALL Supabase hosts. This session (2026-08-12)
proved *.vercel.app is now allowed (301) but *.supabase.co and supabase.com
are refused at the CONNECT tunnel (502/403 policy denial) BEFORE any request
reaches Supabase. Runtime testing cannot proceed until the environment's
Network access = Custom actually includes *.supabase.co AND is saved for the
environment THIS session runs in. See VERIFIED.md 2026-08-12 for proof.
ACTION FOR TOM: confirm *.supabase.co is in the Custom allowlist and saved.

## VERIFIED THIS RUN
- Network diagnosis (curl + proxy status): *.vercel.app reachable;
  *.supabase.co / supabase.com blocked (policy denial). See VERIFIED.md.
- Did NOT re-run build/lint this session (unchanged from 2026-08-11; both
  were green then) — no code changed, and the blocker is network, not code.

## UNVERIFIED / GAPS
- Runtime against Supabase (login/data flows) — STILL UNVERIFIED, blocked on
  the allowlist above, not on app code.
- Whether Supabase project lbffnhxwvkzogsywydcd is paused vs active — CANNOT
  be determined from here; CONNECT is refused before reaching Supabase.
- 15 no-img-element / unused-var lint warnings left as-is (cosmetic/perf).
