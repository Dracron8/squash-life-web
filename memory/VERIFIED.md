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

### 2026-08-12 — Supabase is STILL blocked at egress; *.vercel.app is NOT
Proof: Network diagnosis this session (anon key read from next.config.ts):
`curl -m 15 https://lbffnhxwvkzogsywydcd.supabase.co/auth/v1/health -H apikey:<anon>`
-> exit 56, HTTP 000, "CONNECT tunnel failed, response 502". Proxy status
(`curl $HTTPS_PROXY/__agentproxy/status`) records recentRelayFailures:
`connect_rejected` "502 to CONNECT (policy denial)" for
lbffnhxwvkzogsywydcd.supabase.co:443.
Control tests same session:
  - github.com            -> HTTP 400 (reachable; connection made)
  - squash-life-web.vercel.app -> HTTP 301 (reachable — *.vercel.app IS allowed)
  - lbffnhxwvkzogsywydcd.supabase.co -> 502 policy denial (BLOCKED)
  - another-ref.supabase.co          -> 502 policy denial (BLOCKED)
  - supabase.com / api.supabase.com  -> 403 policy denial (BLOCKED)
Conclusion: the widened Custom allowlist took effect for *.vercel.app but
NOT for *.supabase.co (nor supabase.com). ALL Supabase hosts are refused at
the CONNECT tunnel BEFORE any request reaches Supabase — so paused-vs-active
of project ref lbffnhxwvkzogsywydcd CANNOT be determined from here. Runtime /
end-to-end against Supabase remains UNVERIFIED, blocked on the allowlist, not
on app code. Per proxy README: do not retry policy denials; report the host.
