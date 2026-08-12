@AGENTS.md

# PROJECT BRAIN — SqshLife

> NEW HERE? Read ONBOARD.md first.
> The `@AGENTS.md` import above is load-bearing — it carries the Next.js 16
> agent rules. Keep it.

## HARD RULE — READ BEFORE EDITING THIS FILE
Cap: 200 lines. To add an entry you must merge or delete one.
No agent may write to this file. Only Tom promotes entries here.

---

## WHAT THIS PROJECT IS
SqshLife — a squash tournament platform. A tournament director creates and
runs a tournament (players, draws, scheduling, brackets); players sign up
and follow their schedule and results. Web app: Next.js 16 + React 19,
Supabase (auth + data), Tailwind 4, TypeScript.

---

## START OF EVERY RUN
1. `git pull` before anything.
2. Read this file — and AGENTS.md (imported above). Next.js 16 has breaking
   changes vs training data; read node_modules/next/dist/docs before writing
   Next code.
3. Read memory/STATE.md — where things stand now.
4. Read memory/CANDIDATES.md — hints, not rules.

## END OF EVERY RUN
1. Append proven facts to memory/VERIFIED.md, with the command and its exit
   code as proof.
2. Append new lessons to memory/CANDIDATES.md. Never to this file.
3. Rewrite memory/STATE.md to match reality.
4. Append to memory/DECISIONS.md if a choice was made. Never edit an old entry.
5. Run check_brain.py. Commit. One writer at a time.

---

## VERIFICATION GATE — NON-NEGOTIABLE
Nothing is "done" until proven by execution, not inspection.
- Code: it builds and runs. `npm run build` and `npm run lint` must pass.
  Reading it is not verification.
- A claim about behaviour: show the run and the output.
- If you cannot verify it, report UNVERIFIED and stop.

Reporting "done" without proof is the worst failure mode here.

---

## LOCKED PRINCIPLES
[FILL IN — the non-negotiables for SqshLife. Empty until Tom sets them.]

---

## DO NOT BUILD YET
[FILL IN — the things it is too early to build, and the unknown each one
waits on. Empty until Tom sets them.]

---

## KNOWN PITFALLS
- Next.js 16 has breaking changes vs training data. Read
  node_modules/next/dist/docs before writing Next code. (Source: AGENTS.md.)
