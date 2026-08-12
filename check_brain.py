#!/usr/bin/env python3
"""Brain integrity checker. Run before every commit.

Four gates:
  1. All four memory/ files exist
  2. CLAUDE.md is under its 200-line cap
  3. DECISIONS.md has not shrunk vs the previous commit (append-only)
  4. Every VERIFIED.md entry carries a "Proof:" line

Exit 0 = all passed. Exit 1 = something failed.
"""

import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
MEM = os.path.join(ROOT, "memory")
REQUIRED = ["CANDIDATES.md", "DECISIONS.md", "STATE.md", "VERIFIED.md"]
CAP = 200

failures = []


def gate(name, ok, detail=""):
    print(f"{'PASS' if ok else 'FAIL'}: {name}")
    if not ok:
        if detail:
            for line in detail.splitlines():
                print(f"      {line}")
        failures.append(name)


# --- gate 1: files exist -----------------------------------------------
missing = [f for f in REQUIRED if not os.path.isfile(os.path.join(MEM, f))]
gate("all four memory/ files exist", not missing,
     "\n".join(f"missing: memory/{f}" for f in missing))

# --- gate 2: CLAUDE.md under cap ---------------------------------------
claude = os.path.join(ROOT, "CLAUDE.md")
if os.path.isfile(claude):
    with open(claude, encoding="utf-8") as fh:
        n = sum(1 for _ in fh)
    gate(f"CLAUDE.md under {CAP}-line cap", n <= CAP,
         f"CLAUDE.md is {n} lines, cap is {CAP}. Merge or delete an entry.")
else:
    gate(f"CLAUDE.md under {CAP}-line cap", False, "CLAUDE.md not found")

# --- gate 3: DECISIONS.md append-only ----------------------------------
dec = os.path.join(MEM, "DECISIONS.md")
if os.path.isfile(dec):
    with open(dec, encoding="utf-8") as fh:
        now = sum(1 for _ in fh)
    try:
        prev_raw = subprocess.run(
            ["git", "show", "HEAD:memory/DECISIONS.md"],
            cwd=ROOT, capture_output=True, text=True, timeout=15)
        prev = len(prev_raw.stdout.splitlines()) if prev_raw.returncode == 0 else 0
    except Exception:
        prev = 0
    gate("DECISIONS.md not shrunk (append-only)", now >= prev,
         f"was {prev} lines at HEAD, now {now}. Entries were removed.")
else:
    gate("DECISIONS.md not shrunk (append-only)", False, "DECISIONS.md not found")

# --- gate 4: every VERIFIED entry has proof ----------------------------
ver = os.path.join(MEM, "VERIFIED.md")
if os.path.isfile(ver):
    text = open(ver, encoding="utf-8").read()
    body = text.split("---", 1)[-1]
    blocks = re.split(r"^### ", body, flags=re.M)[1:]
    bad = [b.splitlines()[0].strip() for b in blocks if "Proof:" not in b]
    gate('every VERIFIED.md entry has Proof:', not bad,
         "\n".join(f'entry without "Proof:" line: ### {b}' for b in bad))
else:
    gate('every VERIFIED.md entry has Proof:', False, "VERIFIED.md not found")

print()
if failures:
    print(f"{len(failures)} failure(s). Brain integrity check FAILED.")
    sys.exit(1)
print("All checks passed. Brain integrity OK.")
sys.exit(0)
