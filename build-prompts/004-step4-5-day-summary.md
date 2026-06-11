**Next Instructions for C2 – Finish the Web TD Wizard (Step 4 DAY + Step 5 SUMMARY) + Fix Stepper Progress**

**Important context (ignore all previous Flutter claims):**
We are only building the **Next.js** 5-step wizard in `squash_life_web/app/td/tournaments/new/page.tsx`. The big Flutter status report you gave last time is irrelevant here — that describes the mobile app, not the web version we're porting.

Current state:
- Step 1 (CLUB) is solid (save + advance).
- Steps 2 (DETAILS) and 3 (SCHEDULE with day_schedules editor) have UIs from prior work.
- The stepper (`STEPS` map) only marks things "done" based on the live `step` state (`done = n < step`).
- On page load the component always starts with `useState(1)`, so even if form data is restored from localStorage, only CLUB ever shows the ✓. This is why you're seeing "only the Club section is complete".
- Steps 4 and 5 are still placeholders.

**Goals for this chunk:**
1. Make the stepper correctly reflect completed sections (so when you're on step 4 or 5, or after reload, previous steps show with ✓ and the red progress line).
2. Fully implement **Step 4 – DAY** (day-of logistics).
3. Fully implement **Step 5 – SUMMARY** + the actual tournament creation logic.
4. Make the whole 5-step flow work end-to-end so you can go all the way through and create a real tournament.

**Specific requirements:**

**A. Fix stepper progress (most important for the UX complaint)**
- Persist the current `step` in localStorage alongside the form (update `LS_KEY` usage or use a second key like `td_wizard_step_v3`).
- On mount, after restoring the form, also restore the step (default to 1).
- As a fallback, add simple inference: if `_club_id` exists → at least step 2, if `name` exists → at least step 3, if `day_schedules.length > 0` → at least step 4, etc.
- Optional but nice: make previously completed step pills clickable so you can jump back to review/edit earlier sections.

**B. Implement Step 4 (DAY)**
Replace the placeholder for `step === 4` with a real UI using the exact same styling (`sectionCls`, `sectionHeadCls`, `labelCls`, `inputCls`, `Toggle`).

Fields to wire (from `WizardForm`):
- `check_in_required` (Toggle)
- `check_in_open_mins` (number, only show if check_in_required)
- `live_scoring` (Toggle)
- `score_verification` (Toggle)
- `print_score_sheets` (Toggle)
- `court_assignment_display` (select or segmented control — reasonable options: "App only", "App + printed", "Printed only")

Add appropriate validation in the `validate()` function for step 4.

**C. Implement Step 5 (SUMMARY) + Creation Logic**
- Replace the step 5 placeholder with a proper review screen.
- Show clean sections/cards for the key data collected so far:
  - Club (name + city + courts)
  - Tournament (name, draw_type, dates, fees, etc.)
  - Schedule (the day blocks + match duration + lunch settings)
  - Day-of settings
- At the bottom: a big prominent button **"CREATE TOURNAMENT"** (use the red style, with loading state like "CREATING...").

In the creation function:
- Get the current user (redirect if none).
- First insert a row into the `tournaments` table (at minimum: `td_id`, `name`, `status: 'setup_pending'`, `draw_type`, and link the club if needed).
- Then insert into `tournament_details` using the existing `buildTournamentDetailsPayload(newTournamentId, form._club_id, form)`.
- On success: clear the wizard localStorage, show success, and redirect to the new tournament (probably `/td/tournaments/${newId}` or the detail view).
- Add basic validation for step 5 (everything critical should be filled).

Update the navigation area:
- For step 5 the main button should say "CREATE TOURNAMENT" and call your new creation function instead of the generic `next()`.

**D. Cleanup**
- Remove the last "This step is coming in the next chunk" placeholder block.
- Make sure `buildTournamentDetailsPayload` is imported from `@/lib/td/flutterParity`.
- Extend `validate()` for steps 4 and 5.
- Keep the existing `next()` / `back()` / form persistence working for the new steps.

**After you finish:**
Run this exact command and paste the full output:

```bash
cd /home/tb/ai-playground/squash_life_web && npm run build 2>&1 | tail -20
```

Also briefly describe what you built for steps 4 and 5 and whether the stepper now correctly shows previous sections as complete with ✓ after reload.
