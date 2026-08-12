# ONBOARD — read this first, then CLAUDE.md

You have no prior context. This file gets you working in five minutes.

## WHAT THIS IS
SqshLife — a squash tournament platform (Next.js 16 + React 19, Supabase,
Tailwind 4, TypeScript). Tournament directors create and run tournaments
(draws, scheduling, brackets); players sign up and follow their schedule.

Status: IN BUILD. A working app already exists; see memory/STATE.md.

## THE FILES AND WHAT EACH IS FOR

**AGENTS.md** — Next.js 16 agent rules. Breaking changes vs training data;
read node_modules/next/dist/docs before writing Next code. CLAUDE.md
imports it.

**CLAUDE.md** — permanent canon. Locked principles, the verification gate,
the run checklist. Hard cap 200 lines. YOU MAY NOT WRITE TO IT. Only Tom
promotes entries here.

**memory/STATE.md** — where things stand right now. Rewritten every run.

**memory/DECISIONS.md** — every decision with its reasoning. APPEND-ONLY.
Never edit or delete an entry; append a reversal if one is reversed.

**memory/VERIFIED.md** — facts proven by execution. Every entry carries its
proof: the command and its exit code. No proof, no entry.

**memory/CANDIDATES.md** — lessons you think you learned. QUARANTINE. Hints,
not rules. Graduates to CLAUDE.md only when Tom approves it, or the same
lesson is independently hit a second time.

**check_brain.py** — integrity checker. Run it before you commit.

## START OF RUN
1. git pull
2. Read CLAUDE.md (and AGENTS.md)
3. Read memory/STATE.md
4. Skim memory/CANDIDATES.md — hints only

## END OF RUN
1. Append proven facts to VERIFIED.md, with proof
2. Append lessons to CANDIDATES.md
3. Rewrite STATE.md
4. Append to DECISIONS.md if a choice was made
5. Run: python3 check_brain.py
6. Commit and push. One writer at a time.

## THE GATE
Nothing is done until execution proves it. For this app that means
`npm run build` and `npm run lint` pass. If you cannot prove it, say
UNVERIFIED and stop.

## HOW TO RUN THE CHECKER
    python3 check_brain.py
    echo $?

Exit 0 = all four gates passed. Exit 1 = something failed; the message
says what.
