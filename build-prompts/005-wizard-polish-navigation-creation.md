**Next Instructions for C2 – Wizard Polish, Navigation, and Creation Flow (Post Step 4/5)**

**Context:**
Assume the work from prompt 004 (Step 4 DAY + Step 5 SUMMARY + stepper persistence + creation logic) has been completed and the build is green. The basic 5-step wizard now exists and can create a tournament.

The main remaining problems from the user's feedback:
- The stepper only ever showed "CLUB" as complete in practice.
- The flow didn't feel complete (hard to go back and edit previous steps, no good way to resume, creation might not have been fully wired or redirected nicely).
- After creation the user should land in a useful place and the wizard state should be cleaned.

**Goals for this chunk:**
- Make the stepper fully functional for navigation (clickable previous steps so you can go back and edit).
- Improve the overall wizard UX so it feels like a proper multi-step form you can resume.
- Ensure the final creation is robust (proper Supabase inserts, good error handling, success feedback, redirect).
- Clean up any loose ends from the 004 implementation (state management, localStorage for step, etc.).

**Specific tasks:**

1. **Make the stepper clickable for navigation**
   - Allow clicking on any "done" step (the ones with ✓) to jump back to that step.
   - Do **not** allow jumping forward past the current furthest completed step (to prevent skipping required saves like the Club save).
   - Update the stepper rendering so completed steps are interactive buttons (keep the visual style — the red background for done, etc.).
   - When jumping back, do **not** lose the data the user has already entered in later steps (the form state should stay).

2. **Improve step persistence and resumption**
   - Make sure both the form **and** the current step are reliably saved to localStorage on every change.
   - On initial load:
     - Restore form data (already exists).
     - Restore the last `step`.
     - If the restored step is > 1 but the prerequisite data is missing (e.g. no _club_id when trying to be on step 2+), fall back gracefully to the earliest valid step.
   - Add a small "Clear wizard / Start over" button somewhere (probably near the top or in the stepper area) that clears the localStorage key(s) and resets to step 1. This is useful during development and for the user.

3. **Polish the Step 5 (SUMMARY) screen**
   - Make the review sections look clean and scannable (use the existing section/card styling).
   - Show the most important fields from each previous step (Club name + courts, Tournament name + dates + draw type, number of schedule days + capacity estimate, key day-of toggles).
   - If any critical data is missing, show a clear warning and disable the Create button (or guide the user back).
   - After a successful creation:
     - Clear the wizard localStorage completely.
     - Show a success message (or immediately redirect — decide on the best UX).
     - Redirect the user to the new tournament's detail page (use the id returned from the insert). The route is likely `/td/tournaments/[id]`.

4. **Robust creation logic (if not fully done in 004)**
   - Make sure the insert into `tournaments` and `tournament_details` uses the payload helpers from `flutterParity.ts`.
   - Handle the case where the club was just created in step 1 (use the `_club_id` we stored on the form).
   - Add proper loading state on the "CREATE TOURNAMENT" button.
   - Add good error handling (show the error in the existing error banner style if the Supabase insert fails).
   - Consider setting a sensible default `status` on the new tournament (e.g. 'setup_pending').

5. **Small UX / flow improvements**
   - When the user is on step 5 and clicks "BACK", it should go to step 4 (standard behavior).
   - Make sure the stepper progress line (the red connectors) updates correctly when you jump between steps.
   - Optional but recommended: After jumping back to an earlier step and making changes, the "NEXT" buttons on intermediate steps should still just advance without re-saving to DB (only Step 1 has the special club save; later steps are client-side until the final create).

**Files you will likely touch:**
- `app/td/tournaments/new/page.tsx` (main work)
- Possibly small updates in `lib/td/flutterParity.ts` if a helper is missing for the creation.

**Do not** start implementing anything beyond the wizard itself in this chunk (no draw generation, no match scheduling, no player registration screens, etc.). Stay focused on making the 5-step creation flow solid and usable.

**After completing this prompt:**
Run the verification command and paste the output:

```bash
cd /home/tb/ai-playground/squash_life_web && npm run build 2>&1 | tail -20
```

Also tell me:
- Whether you can now click previous steps in the stepper and go back/edit.
- What happens on a full page reload after advancing a few steps (does it remember the step?).
- What happens after you successfully create a tournament (where does it redirect, is the state cleared?).

If anything from prompt 004 was incomplete or broken, note it here so we can address it.