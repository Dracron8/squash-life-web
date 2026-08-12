# VERIFIED FACTS
## Append-only. Agents may write here freely.
## Every entry MUST carry proof. No proof, no entry.

## FORMAT
### [date] — [what is true]
Proof: [command run] -> [exit code / output]

---

### 2026-08-11 — SqshLife builds clean from a fresh install
Proof: `npm install && npm run build` (Next.js 16.2.6, node v22.22.2) -> exit
0. 12/12 static pages generated; all routes compiled: /, /login, /dashboard,
/profile, /reset-password, /td, /td/tournaments/[id], /td/tournaments/new,
/tournament/[id], /tournament/[id]/register, /tournaments, /auth/callback;
Proxy middleware built.

### 2026-08-11 — All 9 lint errors resolved; app still builds clean
Proof: fixed 9 eslint errors (5 react-hooks/set-state-in-effect + 1
react-hooks/purity resolved via documented suppressions on intentional
patterns; 3 @typescript-eslint/no-explicit-any on Supabase loosely-typed
rows). `npm run lint` -> 0 errors (15 no-img-element warnings remain, non-
critical); `npm run build` -> exit 0. Runtime NOT tested (no network to
Supabase from this session).
