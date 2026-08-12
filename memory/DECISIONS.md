# DECISION LOG
## APPEND-ONLY. Never edit or delete an entry.
## If a decision is reversed, append the reversal. The old entry stays.

## FORMAT
### [date] — [what was decided]
Why: [reasoning]
Rejected: [what we chose against, and why]

---

### 2026-08-11 — Installed the brain scaffold into SqshLife
Why: bring the memory/verification-gate discipline to the SqshLife repo:
     STATE/DECISIONS/VERIFIED/CANDIDATES + check_brain.py, with CLAUDE.md as
     canon. Nothing is "done" until it builds/runs.
Rejected: overwriting CLAUDE.md's `@AGENTS.md` import — kept it so the
     Next.js 16 agent rules still load; the brain layers on top.

### 2026-08-12 — Proved client-side Supabase paths by replaying calls, not by
     driving the in-browser JS
Why: the sandbox's headless browser has no direct internet and wasn't wired
     to the egress proxy, so its in-browser fetches to *.supabase.co reset.
     Routing the browser through the proxy hit CA/relay friction (proxy only
     tunnels HTTPS CONNECT; localhost bypass misbehaved -> 405 relay page).
     Rather than burn effort on browser/proxy plumbing that production users
     never touch (their browsers reach supabase.co directly), I replayed the
     exact supabase-js calls (REST select + auth token grant) with the anon
     key over the allowed egress path. Those returned 200 (real rows) and 400
     "Invalid login credentials" respectively — sufficient proof the client
     paths are wired and reachable.
Rejected: importing the proxy CA into the Playwright Chromium NSS store to
     force a full in-browser auth round-trip — high effort, and it would only
     re-prove what the SSR render + call-replay already establish.
