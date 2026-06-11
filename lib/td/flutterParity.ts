/**
 * Tournament wizard payloads aligned with squash_life Flutter TDSetupFlow.
 * Flutter is the source of truth for column names and field order.
 *
 * Step 0 (Club Profile) payload reference: _saveClubAndContinue in td_setup_flow.dart
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- DB row shapes + flexible helpers for wizard <-> Supabase roundtrips */

export type DaySchedule = {
  label: string
  start_time: string
  end_time: string
}

export type WizardForm = {
  // ── Step 1 · Club Profile (Flutter Step 0) ───────────────────────────────
  venue_name: string        // clubs.name
  venue_address: string     // clubs.address
  venue_city: string        // clubs.city
  venue_province: string    // clubs.province
  venue_country: string     // clubs.country
  venue_phone: string       // clubs.phone
  venue_website: string     // clubs.website
  num_courts: string        // clubs.num_courts
  num_locations: string     // clubs.num_locations
  surface_type: string      // clubs.surface_type  — 'Hardwood'|'Synthetic'|'Glass'|'Concrete'
  has_doubles_courts: boolean
  num_doubles_courts: string
  // Amenities
  glass_back_walls: boolean
  wifi: boolean
  locker_rooms: boolean
  parking: boolean

  // Internal wizard state (populated after Step 1 club save)
  _club_id?: string

  // ── Step 2 · Tournament Details (Flutter Step 1) ─────────────────────────
  name: string              // tournaments.name
  draw_type: string         // tournament_details.format
  start_date: string
  end_date: string
  has_singles_draw: boolean
  has_doubles_draw: boolean
  singles_entry_fee: string
  doubles_entry_fee: string
  both_entry_fee: string
  min_rest_hours: string
  max_matches_per_day: string
  warm_up_minutes: string
  registration_opens: string
  registration_deadline: string
  has_referee: boolean
  has_trophy: boolean
  prize_purse: string
  has_waitlist: boolean
  waitlist_spots: string
  forfeit_minutes: string
  multi_division_allow_multiple: boolean
  has_player_gift: boolean
  player_gift_desc: string
  sponsor_name: string
  has_social_event: boolean
  social_event_time: string
  social_event_desc: string
  tournament_notes: string
  td_email: string
  td_phone_comm: string
  auto_notify_draw: boolean
  auto_reminder_match: boolean
  reminder_hours: string
  welcome_message: string

  // ── Step 3 · Schedule (Flutter Step 2b) ──────────────────────────────────
  day_schedules: DaySchedule[]
  rolling_lunch: boolean
  lunch_break_duration_mins: string
  match_duration_minutes: string

  // ── Step 4 · Day-of Logistics (Flutter Step 3b) ───────────────────────────
  check_in_required: boolean
  check_in_open_mins: string
  live_scoring: boolean
  score_verification: boolean
  print_score_sheets: boolean
  court_assignment_display: string

  // ── Legacy / DB-compat (kept for payload builder + localStorage round-trip)
  has_fixed_lunch: boolean
  lunch_start: string
  lunch_duration_mins: string
  afternoon_start: string
  has_dinner_break: boolean
  dinner_start: string
  dinner_duration_mins: string
  has_evening_session: boolean
  evening_start: string
  daily_end: string
  morning_start: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toMins(t: string): number {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** Never null/NaN — Postgres NOT NULL integer columns need this */
function intField(val: string | number | null | undefined, fallback: number): number {
  if (val === '' || val === null || val === undefined) return fallback
  const n = Number(val)
  return Number.isFinite(n) ? n : fallback
}

/** Largest power of 2 that is ≤ n. Returns 0 if n ≤ 0. */
function toPow2Floor(n: number): number {
  if (n <= 0) return 0
  let p = 1
  while (p * 2 <= n) p *= 2
  return p
}

// ─── Capacity Calculation ─────────────────────────────────────────────────────

/**
 * Max bracket size (power of 2) the schedule can accommodate.
 * Mirrors Flutter _scheduleMaxPlayers logic then rounds to bracket size.
 */
export function calcScheduleMaxPlayers(f: WizardForm): number {
  const courts = Number(f.num_courts) || 0
  const matchMins = Number(f.match_duration_minutes) || 40
  const warmup = 0  // warmup not subtracted in Flutter _scheduleMaxPlayers
  const slot = matchMins + warmup
  if (courts <= 0 || slot <= 0) return 0

  // New path: per-day schedules
  if (f.day_schedules && f.day_schedules.length > 0) {
    const isRolling = f.rolling_lunch !== false
    const lunchDur = isRolling ? 0 : intField(f.lunch_break_duration_mins, 0)
    let total = 0
    for (const d of f.day_schedules) {
      const mins = toMins(d.end_time) - toMins(d.start_time) - lunchDur
      if (mins <= 0) continue
      total += Math.floor(mins / slot) * courts
    }
    return toPow2Floor(total)
  }

  // Legacy path
  if (!f.morning_start || !f.daily_end || !f.start_date || !f.end_date) return 0
  let dailyMins = toMins(f.daily_end) - toMins(f.morning_start)
  if (f.has_fixed_lunch) dailyMins -= intField(f.lunch_duration_mins, 0)
  if (f.has_dinner_break) dailyMins -= intField(f.dinner_duration_mins, 0)
  if (dailyMins <= 0) return 0
  const days = Math.max(
    1,
    Math.round((new Date(f.end_date).getTime() - new Date(f.start_date).getTime()) / 86400000) + 1,
  )
  return toPow2Floor(Math.floor((dailyMins * days * courts) / slot))
}

// ─── Payload Builders ─────────────────────────────────────────────────────────

export function toPgTime(t: string | null | undefined): string | null {
  if (!t) return null
  return t.length === 5 ? `${t}:00` : t
}

/**
 * Club insert/update payload.
 * Keys match Flutter _saveClubAndContinue exactly.
 */
export function buildClubPayload(tdId: string, f: WizardForm) {
  return {
    td_id:              tdId,
    name:               f.venue_name.trim(),
    address:            f.venue_address.trim(),
    city:               f.venue_city.trim(),
    province:           f.venue_province.trim(),
    country:            f.venue_country.trim(),
    phone:              f.venue_phone.trim(),
    website:            f.venue_website.trim(),
    num_courts:         Number(f.num_courts) || 1,
    num_locations:      Number(f.num_locations) || 1,
    surface_type:       f.surface_type,
    glass_back_walls:   f.glass_back_walls,
    wifi:               f.wifi,
    locker_rooms:       f.locker_rooms,
    parking:            f.parking,
    has_doubles_courts: f.has_doubles_courts,
    num_doubles_courts: f.has_doubles_courts ? Number(f.num_doubles_courts) || 0 : 0,
  }
}

/** tournament_details row — full payload */
export function buildTournamentDetailsPayload(
  tournamentId: string,
  clubId: string | null,
  f: WizardForm,
) {
  const maxPlayers = calcScheduleMaxPlayers(f)
  const singlesFee = f.singles_entry_fee ? Number(f.singles_entry_fee) : 0
  const doublesFee = f.has_doubles_draw && f.doubles_entry_fee ? Number(f.doubles_entry_fee) : 0
  const bothFee =
    f.has_singles_draw && f.has_doubles_draw && f.both_entry_fee
      ? Number(f.both_entry_fee)
      : 0
  const minRestMinutes = (Number(f.min_rest_hours) || 3) * 60

  const firstDay = f.day_schedules?.[0]
  const lastDay  = f.day_schedules?.slice(-1)[0]
  const dailyStartTime = toPgTime(firstDay?.start_time || f.morning_start)
  const dailyEndTime   = toPgTime(lastDay?.end_time    || f.daily_end)
  const morningStart   = toPgTime(firstDay?.start_time || f.morning_start)

  const isRolling = f.rolling_lunch !== false && !f.has_fixed_lunch
  const lunchDurMins = isRolling
    ? 60
    : intField(f.lunch_break_duration_mins || f.lunch_duration_mins, 60)
  const lunchStartTime = isRolling ? null : toPgTime(f.lunch_start)

  return {
    tournament_id: tournamentId,
    club_id:       clubId,

    start_date:        f.start_date || null,
    end_date:          f.end_date   || null,
    daily_start_time:  dailyStartTime,
    daily_end_time:    dailyEndTime,

    courts_available:      Number(f.num_courts) || null,
    match_duration_minutes: Number(f.match_duration_minutes) || 40,
    format:  f.draw_type,
    scoring: 'PAR',
    best_of: 3,

    has_singles_draw:    f.has_singles_draw,
    has_doubles_draw:    f.has_doubles_draw,
    doubles_court_count: f.has_doubles_courts ? Number(f.num_doubles_courts) || 1 : 1,

    singles_fee:   singlesFee,
    doubles_fee:   doublesFee,
    both_fee:      bothFee,
    deposit_amount: 0,
    entry_fee:     singlesFee,

    min_rest_minutes:    minRestMinutes,
    max_matches_per_day: Number(f.max_matches_per_day) || 2,
    warm_up_minutes:     Number(f.warm_up_minutes) || 10,
    max_players:         maxPlayers || null,

    registration_open_date: f.registration_opens   || null,
    registration_deadline:  f.registration_deadline || null,

    morning_start:     morningStart,
    lunch_start:       lunchStartTime,
    lunch_duration_mins: lunchDurMins,
    afternoon_start:   toPgTime(f.afternoon_start),
    has_dinner_break:  f.has_dinner_break,
    dinner_start:      f.has_dinner_break ? toPgTime(f.dinner_start) : null,
    dinner_duration_mins: f.has_dinner_break ? intField(f.dinner_duration_mins, 60) : 60,
    has_evening_session: f.has_evening_session,
    evening_start:     f.has_evening_session ? toPgTime(f.evening_start) : null,

    has_waitlist:    f.has_waitlist,
    waitlist_spots:  f.has_waitlist ? Number(f.waitlist_spots) || 0 : 0,
    forfeit_minutes: Number(f.forfeit_minutes) || 15,
    multi_division:  f.multi_division_allow_multiple,
    multi_division_allow_multiple: f.multi_division_allow_multiple,

    referee_required: f.has_referee,
    has_trophy:       f.has_trophy,
    prize_purse:      Number(f.prize_purse) || 0,

    has_player_gift:  f.has_player_gift,
    player_gift_desc: f.has_player_gift ? f.player_gift_desc.trim() : '',
    sponsor_name:     f.sponsor_name.trim(),
    has_social_event: f.has_social_event,
    social_event_time: f.has_social_event ? toPgTime(f.social_event_time) : null,
    social_event_desc: f.has_social_event ? f.social_event_desc.trim() : '',
    tournament_notes:  f.tournament_notes.trim(),

    td_email:            f.td_email.trim(),
    td_phone_comm:       f.td_phone_comm.trim(),
    auto_notify_draw:    f.auto_notify_draw,
    auto_reminder_match: f.auto_reminder_match,
    reminder_hours:      Number(f.reminder_hours) || 2,
    welcome_message:     f.welcome_message.trim(),

    check_in_required:    f.check_in_required,
    check_in_open_mins:   f.check_in_required ? Number(f.check_in_open_mins) || 60 : 60,
    live_scoring:         f.live_scoring,
    score_verification:   f.score_verification,
    referee_per_match:    false,
    first_round_refs_provided: false,
    print_score_sheets:   f.print_score_sheets,
    court_assignment_display: f.court_assignment_display,

    // Legacy alias columns
    singles_entry_fee: singlesFee,
    doubles_entry_fee: doublesFee,
    both_entry_fee:    bothFee,
    registration_opens: f.registration_opens || null,
    has_referee:       f.has_referee,
    trophy_awarded:    f.has_trophy,
    has_doubles:       f.has_doubles_draw,
    min_rest_hours:    Number(f.min_rest_hours) || 3,
    warmup_minutes:    Number(f.warm_up_minutes) || 10,
  }
}

/**
 * Reconstruct per-day schedule blocks for display / edit round-trip.
 * Since raw day_schedules are not stored as a column (they are collapsed into
 * daily_start/end + derived fields by buildTournamentDetailsPayload), we
 * synthesize a uniform block per calendar day using the stored daily window.
 * This provides explicit per-day visibility in SUMMARY and OVERVIEW.
 */
export function reconstructDaySchedules(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  dailyStart: string | null | undefined,
  dailyEnd: string | null | undefined,
): DaySchedule[] {
  if (!startDate || !endDate) return []
  const s = new Date(startDate + 'T00:00:00')
  const e = new Date(endDate + 'T00:00:00')
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return []
  const startT = dailyStart ? dailyStart.slice(0, 5) : '08:00'
  const endT = dailyEnd ? dailyEnd.slice(0, 5) : '22:00'
  const days: DaySchedule[] = []
  let i = 1
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    days.push({
      label: `Day ${i++}`,
      start_time: startT,
      end_time: endT,
    })
  }
  return days
}

/**
 * Map DB tournament + tournament_details(+clubs) back into WizardForm shape
 * for loading the editor in edit mode. Uses reconstruction for day_schedules
 * (uniform per the stored daily window) and populates both primary wizard
 * fields and legacy compat fields so that buildTournamentDetailsPayload
 * and the UI produce consistent results.
 */
export function loadWizardFormFromDb(
  tournament: Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  detail: Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  club: Record<string, any> | null, // eslint-disable-line @typescript-eslint/no-explicit-any
): Partial<WizardForm> {
  if (!detail) return {}

  const toTime = (t: string | null | undefined) => (t ? t.slice(0, 5) : '')
  const toNumStr = (n: number | null | undefined, fb = '') => (n != null ? String(n) : fb)

  const hasFixedLunch = !!detail.lunch_start
  const isRolling = !hasFixedLunch

  // Reconstruct day blocks (uniform)
  const day_schedules = reconstructDaySchedules(
    detail.start_date,
    detail.end_date,
    detail.daily_start_time || detail.morning_start,
    detail.daily_end_time,
  )

  const c = club || detail.clubs || {}

  return {
    // Club / venue (Step 1)
    venue_name: c.name || '',
    venue_address: c.address || '',
    venue_city: c.city || '',
    venue_province: c.province || '',
    venue_country: c.country || 'Canada',
    venue_phone: c.phone || '',
    venue_website: c.website || '',
    num_courts: toNumStr(c.num_courts ?? detail.courts_available, '4'),
    num_locations: toNumStr(c.num_locations, '1'),
    surface_type: c.surface_type || 'Hardwood',
    has_doubles_courts: !!c.has_doubles_courts,
    num_doubles_courts: toNumStr(c.num_doubles_courts, '1'),
    glass_back_walls: !!c.glass_back_walls,
    wifi: c.wifi !== false, // default true if missing
    locker_rooms: !!c.locker_rooms,
    parking: !!c.parking,
    _club_id: detail.club_id || c.id || undefined,

    // Tournament (Step 2)
    name: tournament?.name || '',
    draw_type: tournament?.draw_type || detail.format || 'Knockout + Plate',
    start_date: detail.start_date?.slice(0, 10) || '',
    end_date: detail.end_date?.slice(0, 10) || '',
    has_singles_draw: detail.has_singles_draw ?? true,
    has_doubles_draw: detail.has_doubles_draw ?? false,
    singles_entry_fee: toNumStr(detail.singles_entry_fee ?? detail.singles_fee, ''),
    doubles_entry_fee: toNumStr(detail.doubles_entry_fee ?? detail.doubles_fee, ''),
    both_entry_fee: toNumStr(detail.both_entry_fee ?? detail.both_fee, ''),
    min_rest_hours: toNumStr(detail.min_rest_hours ?? (detail.min_rest_minutes ? Math.round(detail.min_rest_minutes / 60) : 3), '3'),
    max_matches_per_day: toNumStr(detail.max_matches_per_day, '2'),
    warm_up_minutes: toNumStr(detail.warm_up_minutes, '10'),
    registration_opens: detail.registration_opens?.slice(0, 10) || detail.registration_open_date?.slice(0, 10) || '',
    registration_deadline: detail.registration_deadline?.slice(0, 10) || '',
    has_referee: detail.referee_required ?? detail.has_referee ?? false,
    has_trophy: detail.has_trophy ?? detail.trophy_awarded ?? false,
    prize_purse: toNumStr(detail.prize_purse, '0'),
    has_waitlist: !!detail.has_waitlist,
    waitlist_spots: toNumStr(detail.waitlist_spots, '10'),
    forfeit_minutes: toNumStr(detail.forfeit_minutes, '15'),
    multi_division_allow_multiple: detail.multi_division_allow_multiple ?? detail.multi_division ?? false,
    has_player_gift: !!detail.has_player_gift,
    player_gift_desc: detail.player_gift_desc || '',
    sponsor_name: detail.sponsor_name || '',
    has_social_event: !!detail.has_social_event,
    social_event_time: toTime(detail.social_event_time),
    social_event_desc: detail.social_event_desc || '',
    tournament_notes: detail.tournament_notes || '',
    td_email: detail.td_email || '',
    td_phone_comm: detail.td_phone_comm || '',
    auto_notify_draw: detail.auto_notify_draw ?? true,
    auto_reminder_match: detail.auto_reminder_match ?? true,
    reminder_hours: toNumStr(detail.reminder_hours, '2'),
    welcome_message: detail.welcome_message || '',

    // Schedule (Step 3)
    day_schedules,
    rolling_lunch: isRolling,
    lunch_break_duration_mins: toNumStr(detail.lunch_duration_mins, '60'),
    match_duration_minutes: toNumStr(detail.match_duration_minutes, '40'),

    // Day-of (Step 4)
    check_in_required: detail.check_in_required ?? true,
    check_in_open_mins: toNumStr(detail.check_in_open_mins, '60'),
    live_scoring: detail.live_scoring ?? true,
    score_verification: detail.score_verification ?? true,
    print_score_sheets: detail.print_score_sheets ?? false,
    court_assignment_display: detail.court_assignment_display || 'App only',

    // Legacy compat fields (so payload builder + any legacy UI round-trips)
    has_fixed_lunch: hasFixedLunch,
    lunch_start: toTime(detail.lunch_start),
    lunch_duration_mins: toNumStr(detail.lunch_duration_mins, '60'),
    afternoon_start: toTime(detail.afternoon_start),
    has_dinner_break: !!detail.has_dinner_break,
    dinner_start: toTime(detail.dinner_start),
    dinner_duration_mins: toNumStr(detail.dinner_duration_mins, '60'),
    has_evening_session: !!detail.has_evening_session,
    evening_start: toTime(detail.evening_start),
    daily_end: toTime(detail.daily_end_time),
    morning_start: toTime(detail.morning_start || detail.daily_start_time),
  }
}

/**
 * Basic scheduling types and generator for prompt 008.
 * Generates proposed time/court slots respecting wizard rules.
 * For this chunk, uses reconstructed or provided day_schedules.
 */
export type ScheduleSlot = {
  dayLabel: string;
  court: number;
  start_time: string;
  end_time: string;
  player1_id?: string | null;
  player2_id?: string | null;
  match_id?: string | null;
};

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = (h || 0) * 60 + (m || 0) + mins;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

export function generateBasicSchedule(
  detail: Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  registrations: Record<string, any>[] = [], // eslint-disable-line @typescript-eslint/no-explicit-any
): ScheduleSlot[] {
  const slots: ScheduleSlot[] = [];
  const numCourts = Number(detail.courts_available) || Number(detail.num_courts) || 4;
  const matchMins = Number(detail.match_duration_minutes) || 40;
  const restMins = (Number(detail.min_rest_hours) || 3) * 60;

  const startT = detail.daily_start_time || detail.morning_start || '08:00';
  const endT = detail.daily_end_time || '22:00';

  const isRolling = detail.rolling_lunch !== false && !detail.has_fixed_lunch;
  const lunchDur = isRolling ? 0 : (Number(detail.lunch_duration_mins) || 60);
  const lunchStart = isRolling ? null : (detail.lunch_start || '12:00');

  // Use day_schedules if present (from wizard or reconstructed), else derive from dates
  let dayBlocks: DaySchedule[] = detail.day_schedules && detail.day_schedules.length > 0
    ? detail.day_schedules
    : reconstructDaySchedules(detail.start_date, detail.end_date, startT, endT);

  if (dayBlocks.length === 0) {
    // fallback single day
    dayBlocks = [{ label: 'Day 1', start_time: startT, end_time: endT }];
  }

  let regIdx = 0;
  dayBlocks.forEach((block, dIdx) => {
    const dayLabel = block.label || `Day ${dIdx + 1}`;
    let current = block.start_time || startT;
    const dayEnd = block.end_time || endT;
    let court = 1;

    while (current < dayEnd) {
      // skip lunch if fixed
      if (lunchStart && !isRolling) {
        const lunchEnd = addMinutes(lunchStart, lunchDur);
        if (current >= lunchStart && current < lunchEnd) {
          current = lunchEnd;
          continue;
        }
      }

      const end = addMinutes(current, matchMins);
      if (end > dayEnd) break;

      const slot: ScheduleSlot = {
        dayLabel,
        court,
        start_time: current,
        end_time: end,
      };

      // simple assignment if regs
      if (registrations.length > 0) {
        const p1 = registrations[regIdx % registrations.length];
        slot.player1_id = p1?.user_id || p1?.id || null;
        regIdx++;
        if (registrations.length > 1) {
          const p2 = registrations[regIdx % registrations.length];
          slot.player2_id = p2?.user_id || p2?.id || null;
          regIdx++;
        }
      }

      slots.push(slot);
      current = addMinutes(end, restMins);
      court = (court % numCourts) + 1;
      if (slots.length > 100) break; // safety
    }
  });

  return slots;
}
