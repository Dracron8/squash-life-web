/**
 * Tournament wizard payloads aligned with squash_life Flutter TDSetupFlow.
 * Flutter is the source of truth for column names and field order.
 *
 * Step 0 (Club Profile) payload reference: _saveClubAndContinue in td_setup_flow.dart
 */

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
