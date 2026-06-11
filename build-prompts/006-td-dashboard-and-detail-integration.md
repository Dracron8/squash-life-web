**Next Instructions for C2 – Integrate Creation with TD Dashboard + Basic Tournament Detail View**

**Context:**
The 5-step wizard (prompts 004 + 005) should now be fully functional:
- User can go through all steps, including DAY and SUMMARY.
- Stepper is clickable for previous steps.
- Form + step persist across reloads.
- "CREATE TOURNAMENT" works and redirects somewhere useful.
- State is cleared after creation.

The user can now create tournaments from the web, but:
- The new tournament probably doesn't appear in the TD's "My Tournaments" list (`/td` page).
- There is no good place for the TD to land after creation to see what they just set up (schedule blocks, settings, etc.).
- The existing `/td/tournaments/[id]` page may be incomplete or not showing the data we just saved.

**Goals for this chunk:**
- Make sure newly created tournaments appear immediately in the TD dashboard list.
- Build (or complete) a basic but useful detail view at `/td/tournaments/[id]` that shows the data the user entered in the wizard (especially the schedule they defined, plus other settings).
- Improve the post-creation experience (nice redirect + link back to the list).
- Keep everything consistent with the existing styling and Supabase patterns.

**Specific tasks:**

1. **TD Dashboard updates (`app/td/page.tsx` or wherever the list lives)**
   - Ensure the list query includes newly created tournaments (it probably already does if the RLS/permissions are correct).
   - After creation redirect, the list should show the new one at the top (it uses `order by created_at desc` — good).
   - If the list page needs a refresh or re-fetch after redirect, make sure it works (Next.js should handle it, but add a note if client-side state is involved).
   - Show useful columns: name, venue (from club), dates, number of registered (if any), status badge, draw type.
   - The "CREATE TOURNAMENT" button should stay prominent.

2. **Tournament Detail View for TD (`app/td/tournaments/[id]/page.tsx`)**
   - This page should load the tournament + its `tournament_details` + the related club.
   - Display:
     - Header with tournament name + status.
     - Club / Venue info (from the club saved in step 1).
     - Key dates and draw format.
     - The schedule the user defined (the day_schedules blocks — show them nicely, perhaps in a table or cards with start/end times).
     - Match duration, rest rules, lunch settings.
     - Day-of settings (check-in, live scoring, etc.).
     - Entry fees, waitlist, etc. (summarized).
   - Use the same dark neutral + red accent styling as the wizard.
   - Add a "Back to My Tournaments" link.
   - If the data is incomplete or the tournament doesn't belong to the current user, handle gracefully (show message or redirect).

3. **Post-creation redirect & experience**
   - From the wizard's successful creation, redirect to the new tournament's detail page: `/td/tournaments/[new-id]`.
   - Optionally show a small success toast or banner on arrival ("Tournament created successfully").
   - Make sure the URL in the browser is clean.

4. **Data model / query helpers (if needed)**
   - You may need to add or adjust Supabase queries in the detail page to fetch:
     - tournaments row
     - tournament_details row (joined or separate)
     - clubs row (for venue name, courts, etc.)
   - Reuse types or patterns from the existing `app/td/page.tsx` and `lib/td/` if possible.
   - Make sure the `day_schedules` (stored in tournament_details) can be read back and displayed (it may be JSON or separate fields — check the schema from previous work).

5. **Small improvements**
   - In the wizard, after successful creation, you can optionally show a "View Tournament" button that links to the detail page before or instead of auto-redirect.
   - Add the new tournament id to the redirect in a clean way.
   - If there are any missing fields that the detail page needs (e.g. a `slug` or `id` handling), wire them during creation in the SUMMARY step.

**Do not** implement draw generation, bracket building, player registration, score entry, or auto-scheduling in this chunk. Those are later.

Focus only on:
- The list showing new tournaments
- A readable detail page that reflects what the user entered in the 5-step wizard

**Files you will likely touch:**
- `app/td/page.tsx` (list)
- `app/td/tournaments/[id]/page.tsx` (detail)
- Possibly small tweaks in `app/td/tournaments/new/page.tsx` for the redirect
- `lib/td/` if you need new query helpers or types

**After you finish:**
Run the build verification:

```bash
cd /home/tb/ai-playground/squash_life_web && npm run build 2>&1 | tail -20
```

Report back:
- Whether a newly created tournament now appears in the TD list.
- What the detail page at `/td/tournaments/[id]` looks like (does it show the schedule blocks the user defined?).
- Any issues with the redirect after creation.
- The build output.

If the existing detail page was already partially built from earlier work, polish it to match the wizard data and styling rather than rebuilding from scratch.