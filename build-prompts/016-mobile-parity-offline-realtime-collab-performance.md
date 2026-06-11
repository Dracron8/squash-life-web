**Next Instructions for C2 / Internal Implementer – Full Mobile Parity, Offline Support, Real-time Collaboration, and Performance Optimizations (016)**

**Context:**
015 is complete (advanced constraint-based auto-optimizer, performance basics for 100+ , real-time updates via Supabase realtime, mobile/responsive prep and parity notes).

The scheduler v1/v2 is feature-rich, but to make it production/mobile-ready:

- Full mobile parity: make the entire TD wizard, list, detail (including SCHEDULE, DRAW, OVERVIEW), and player views fully responsive, touch-friendly, and add PWA support (manifest, service worker for offline).

- Offline support: allow viewing/editing wizard and schedule in offline mode, with sync on reconnect (using local storage + conflict resolution).

- Real-time collaboration: enhance realtime so multiple TDs can edit the schedule live (e.g., drag-drop slots, see cursors or live updates without conflicts, using presence or locks).

- Performance: deep optimizations for 100+ players (virtual scrolling, web workers for generate, caching, lazy loading data).

- Polish for parity with Flutter (match mobile behaviors, gestures if possible in web).

Keep scope to polish and enablement; no new core scheduler logic.

**Goals:**
- Achieve full mobile-first/responsive UIs across all TD and player pages.
- Add PWA manifest and basic service worker for offline wizard/schedule access.
- Implement offline mode with local saves and sync.
- Enhance realtime for collaborative editing (multi-user schedule updates, simple presence).
- Optimize performance (large lists, generate time, render).
- Update docs with mobile/offline notes.
- Run build, test responsive (describe), prepare for 017 (e.g., full offline sync, advanced collab, production).

**Specific tasks:**

1. **Full Mobile Parity and Responsive Polish**
   - Audit and fix all key pages for mobile:
     - Wizard (new/page.tsx): forms stack on small screens, touch targets large, step indicator scrollable/horizontal.
     - TD list (td/page.tsx): cards stack, filters if any are mobile friendly.
     - Detail ( [id]/page.tsx): tabs become dropdown or stacked on mobile, grids responsive, SCHEDULE grid horizontal scroll or cards, DRAW bracket view mobile-friendly (perhaps list view fallback).
     - Player views (tournament/[id]/page.tsx, My Schedule): similar, ensure readable on phone.
   - Use Tailwind responsive classes (sm:, md: etc.) consistently; add mobile-specific CSS if needed (e.g., larger buttons).
   - Touch: ensure no hover-only interactions, use click/tap everywhere.
   - Test in dev tools mobile viewport; describe in report (e.g., "Wizard usable on iPhone SE, no horizontal scroll except intentional grids").

2. **PWA Support and Offline Basics**
   - Add PWA manifest (public/manifest.json or next-pwa config): name "TD Scheduler", icons, start_url, display "standalone", theme color matching red/neutral.
   - Basic service worker: for offline, cache key pages/assets (using next-pwa or custom). Prioritize wizard form, schedule data (cached from last fetch).
   - Offline mode: 
     - Detect offline (navigator.onLine or events).
     - In wizard: save to localStorage already (from 005), allow full edit offline, queue changes.
     - In SCHEDULE/OVERVIEW: show cached schedule, allow local edits to slots (with warning "offline, sync later").
     - On reconnect: sync queued changes (e.g., save schedule or wizard draft), show "synced" toast.
   - Simple conflict: last-write-wins or timestamp check; note in UI "offline edits may conflict".
   - Add install prompt or "Add to Home Screen" banner for mobile.

3. **Real-time Collaboration Enhancements**
   - Build on 015 realtime: 
     - Add presence: show "User X is editing schedule" (using Supabase presence or simple channel broadcast).
     - Collaborative editing: for SCHEDULE, allow multi-user slot edits (broadcast changes via channel, merge on receive).
     - Locks: simple row-level (e.g., lock a day/court while editing, release on save).
     - In DRAW and OVERVIEW: live updates to schedule-driven data (e.g., if someone generates, others see immediately).
   - Handle disconnects gracefully (reconnect and resync).
   - Add UI indicators: "Live collab enabled", avatars of connected TDs.
   - Toggle in settings: "Enable live collaboration" (default on).

4. **Performance Optimizations for 100+ Players**
   - Scheduler: profile generate (use web worker for heavy computation if possible in Next), optimize loops (e.g., prefilter slots, incremental updates instead of full regen).
   - UI: virtualize long lists (e.g., in SCHEDULE grid for 100+ slots, use react-window or simple pagination by day/court).
   - Data: lazy load registrations/players only when needed (e.g., in dropdowns), cache computed capacity/schedules.
   - List and detail: memoize, avoid re-renders, paginate large reg lists if not already.
   - Test: simulate 150 players (hardcode or seed), measure generate time (<3s target), render perf (no jank on scroll).
   - Add "Performance mode" flag for large fields (simpler viz, no live collab).

5. **Mobile Parity Polish and Docs**
   - Ensure all new features (realtime indicators, offline banners, collab avatars) are mobile-friendly.
   - Update SCHEDULER.md and AUDIT.md with mobile/offline/realtime sections, performance notes, parity status vs Flutter (e.g., "Web PWA approximates mobile; native gestures in Flutter").
   - Add to player export: mobile-optimized ICS or web share.
   - Small fixes from audit if any.

**Files likely to touch:**
- All main: app/td/tournaments/new/page.tsx, [id]/page.tsx, td/page.tsx, tournament/[id]/*.tsx for mobile/responsive.
- lib/td/flutterParity.ts (perf helpers, worker if used).
- public/ for manifest/icons.
- next.config or app for PWA/service worker (use next-pwa if not, or simple).
- supabase for realtime channels/presence.
- Docs: SCHEDULER.md, AUDIT.md, build-prompts/README.

**After you finish:**
Run the build verification:
```bash
cd /home/tb/ai-playground/squash_life_web && npm run build 2>&1 | tail -20
```

Test responsive in browser dev tools (iPhone, iPad, desktop); describe "Wizard fully usable on mobile, SCHEDULE grid scrolls cleanly, no text overflow."

Simulate offline (dev tools), make changes, reconnect, verify sync.

Report back:
- Mobile parity summary (changes for responsive/PWA/offline, test results).
- Realtime collab enhancements (presence, multi-edit, locks).
- Performance numbers (generate time for 120 players, UI smoothness).
- Docs updates (key new sections).
- Full build output.
- Recommendations for 016 (e.g., "full offline sync with conflict UI", "advanced realtime (cursors on slots)", "production deploy checklist", "Flutter mobile parity deep dive").

Work from current state (post-015). Use search_replace. Follow patterns (Tailwind responsive, Supabase realtime if used, existing mobile notes from 015, helpers).

If adding PWA deps or config, keep minimal.

Success: All UIs mobile-first and PWA-ready, offline wizard/schedule works with sync, realtime collab functional, perf good for large fields, docs updated, build green. v2 mobile/realtime ready for audit. The scheduler is now cross-device and collaborative.

Include in report: how this completes the "mobile parity" and "performance" from prior recs, and readiness for production or further (e.g., 016: native app features or scaling).

If time, add a simple "Install PWA" prompt on mobile.