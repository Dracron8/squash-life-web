# CANDIDATE LESSONS — QUARANTINE
## Append-only. Agents write here. NOT trusted yet.
## Read these as hints. Never as rules.

## PROMOTION RULE
An entry moves to CLAUDE.md only when:
  (a) Tom approves it, OR
  (b) the same lesson is independently hit a second time (mark HIT x2)
On promotion, delete it from here.

## FORMAT
### [date] — [proposed lesson]
Came from: [what happened that suggested this]
Status: unconfirmed | HIT x2 | promoted | rejected

---

### 2026-08-12 — A 502-to-CONNECT for *.supabase.co can mean the PROJECT is
     paused, not that the egress allowlist is wrong
Came from: two sessions read the 502 as an allowlist denial and told Tom to
     re-save *.supabase.co. The real cause was a paused Supabase project;
     unpausing it made the identical curl return 200 with no allowlist change.
     Diagnostic tell: vercel/other hosts reach fine, only the supabase host
     502s, and the dashboard shows the project paused/restoring.
Status: unconfirmed

### 2026-08-12 — To runtime-test this app against Supabase, drive it headless
     with the GLOBAL Playwright (1.56.1) — it is NOT a project dep
Came from: node_modules has no playwright; global install lives at
     /opt/node22/lib/node_modules/playwright, Chromium at
     /opt/pw-browsers/chromium-1194/chrome-linux/chrome (the /opt/pw-browsers/
     chromium symlink is not a real dir). Client fetches to *.supabase.co from
     that headless browser reset (no proxied egress) — replay supabase-js's
     REST/auth calls with the anon key via curl to prove the client path.
Status: unconfirmed
