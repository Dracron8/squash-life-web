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
