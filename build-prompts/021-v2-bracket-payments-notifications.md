**Next Instructions for C2 / Internal Implementer – Start v2: Bracket Integration from Schedule, Basic Payments, and Push Notifications (021)**

**Context:**
020 is complete (post-launch monitoring dashboards/alerts, feedback integration with fixes, v2 roadmap documented with priorities like bracket integration, payments, advanced constraints, mobile app, real-time push, player analytics).

The scheduler v1 is live and monitored. Now kick off v2 development per the roadmap.

**Goals for this chunk:**
- Implement basic bracket generation from the optimized schedule (use schedule slots to create match structure, simple single-elim or round-robin brackets).
- Add basic payments support (entry fee collection simulation, status updates for paid/pending).
- Enhance notifications to push (web push or email improvements, using existing comms).
- Integrate with existing DRAW/score tabs if applicable.
- Update docs, run build, report for audit.

**Specific tasks:**

1. **Bracket Integration from Schedule**
   - In lib/td/flutterParity.ts, add helpers for bracket generation: e.g., generateBracketFromSchedule(scheduleSlots, registrations, format).
   - Basic logic: from schedule slots, create match tree or list for main/plate draws, assign players based on seeding or registration order.
   - Store in new or existing matches table (extend if needed).
   - UI in detail DRAW tab: button "Generate Bracket from Schedule", display simple bracket visualization (text or basic UI, reuse or simple from existing).
   - Handle different formats (Knockout, RR, etc.).

2. **Basic Payments**
   - In wizard and detail, for entry fees: add "Collect Payment" simulation (toggle status paid/pending for registrations).
   - Update tournament_details or regs with payment info.
   - In player reg view: show fee, "Pay Now" button (mock).
   - In TD list/OVERVIEW: show paid vs pending counts.
   - Integrate with existing payment_status in registrations.

3. **Push Notifications**
   - Enhance notifications: add web push support (using browser Notification API or service worker for PWA).
   - For schedule changes, new matches, reminders: send push if permitted.
   - Update settings to allow opt-in.
   - Fallback to email if no push.
   - Use existing auto_notify_draw etc. toggles.

4. **Polish and Integration**
   - Tie into existing: e.g., schedule-generated brackets feed into DRAW.
   - Update player My Schedule to show bracket position if applicable.
   - Docs: update ROADMAP, SCHEDULER.md with v2 progress.
   - Build and test the new flows.

**Files likely to touch:**
- lib/td/flutterParity.ts (bracket helpers)
- app/td/tournaments/[id]/page.tsx (DRAW enhancements, payments UI, push setup)
- app/tournament/[id]/page.tsx (player payments, bracket view)
- app/td/tournaments/new/page.tsx (minor for fees)
- Possibly service worker for push if PWA.

**After you finish:**
Run the build verification:
```bash
cd /home/tb/ai-playground/squash_life_web && npm run build 2>&1 | tail -20
```

Report back:
- Summary of bracket gen (how it uses schedule, example output).
- Payments and push features added.
- Full build output.
- v2 progress update.
- Recommendations for 022 (e.g., "full mobile app", "advanced constraints", "payments real integration").

Work from current state. Use search_replace. Follow patterns.

Success: Basic v2 features working, integrated, build green, report for audit. C2/human to review.