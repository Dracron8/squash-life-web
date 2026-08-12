# CURRENT STATE
## Rewritten every run. A snapshot of NOW, not a history.
## Last updated: 2026-08-11

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
- Single branch: main. Brain scaffold just added.

## NEXT TASK
[Awaiting Tom's direction for SqshLife.]

## BLOCKED ON
Nothing.

## UNVERIFIED / GAPS
- Brain just installed; nothing proven for this repo yet. NOT YET VERIFIED:
  does `npm run build` pass? does `npm run lint` pass? Run and record in
  VERIFIED.md before claiming the app is healthy.
