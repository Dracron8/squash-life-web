'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Fuse from 'fuse.js'
import { createClient } from '@/lib/supabase/client'
import CLUBS_RAW from '../../../../squash_clubs.json'

type ClubEntry = { name: string; city: string; region: string; country: string }
const CLUBS = CLUBS_RAW as ClubEntry[]

// ─── Form State ──────────────────────────────────────────────────────────────

type Form = {
  // Step 1
  name: string
  draw_type: string
  venue_name: string
  venue_city: string
  venue_province: string
  venue_country: string
  num_courts: string
  has_doubles_courts: boolean
  num_doubles_courts: string
  surface_type: string
  glass_back_walls: boolean
  num_locations: string

  // Step 2
  has_singles_draw: boolean
  has_doubles_draw: boolean
  singles_entry_fee: string
  doubles_entry_fee: string
  both_entry_fee: string
  has_waitlist: boolean
  waitlist_spots: string
  multi_division_allow_multiple: boolean
  registration_opens: string
  registration_deadline: string
  has_referee: boolean
  has_trophy: boolean
  prize_purse: string
  has_player_gift: boolean
  player_gift_desc: string
  sponsor_name: string
  has_social_event: boolean
  social_event_time: string
  social_event_desc: string
  tournament_notes: string

  // Step 3
  start_date: string
  end_date: string
  morning_start: string
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
  match_duration_minutes: string
  warm_up_minutes: string
  min_rest_hours: string
  max_matches_per_day: string
  forfeit_minutes: string

  // Step 4
  td_email: string
  td_phone_comm: string
  auto_notify_draw: boolean
  auto_reminder_match: boolean
  reminder_hours: string
  welcome_message: string
  check_in_required: boolean
  check_in_open_mins: string
  live_scoring: boolean
  score_verification: boolean
  print_score_sheets: boolean
  court_assignment_display: string
}

const INITIAL: Form = {
  name: '', draw_type: 'Knockout + Plate',
  venue_name: '', venue_city: '', venue_province: '', venue_country: 'Canada',
  num_courts: '4', has_doubles_courts: false, num_doubles_courts: '0',
  surface_type: 'Plaster', glass_back_walls: false, num_locations: '1',

  has_singles_draw: true, has_doubles_draw: false,
  singles_entry_fee: '', doubles_entry_fee: '', both_entry_fee: '',
  has_waitlist: false, waitlist_spots: '10',
  multi_division_allow_multiple: false,
  registration_opens: '', registration_deadline: '',
  has_referee: false, has_trophy: true, prize_purse: '0',
  has_player_gift: false, player_gift_desc: '',
  sponsor_name: '', has_social_event: false,
  social_event_time: '', social_event_desc: '', tournament_notes: '',

  start_date: '', end_date: '',
  morning_start: '08:00', has_fixed_lunch: false, lunch_start: '12:00', lunch_duration_mins: '0',
  afternoon_start: '13:00',
  has_dinner_break: false, dinner_start: '18:00', dinner_duration_mins: '60',
  has_evening_session: false, evening_start: '19:00', daily_end: '22:00',
  match_duration_minutes: '40', warm_up_minutes: '10',
  min_rest_hours: '3', max_matches_per_day: '2', forfeit_minutes: '15',

  td_email: '', td_phone_comm: '',
  auto_notify_draw: true, auto_reminder_match: true, reminder_hours: '2',
  welcome_message: '', check_in_required: true, check_in_open_mins: '60',
  live_scoring: false, score_verification: false,
  print_score_sheets: false, court_assignment_display: 'App only',
}

const STEPS = ['BASICS', 'REGISTRATION', 'SCHEDULE', 'COMMS', 'SUMMARY']
const DRAW_TYPES = ['Knockout + Plate', 'Round Robin → Knockout', 'Full Round Robin', 'Monrad']
const SURFACES = ['Plaster', 'Wood']
const FORFEIT_OPTIONS = ['10', '15', '20']
const REMINDER_OPTIONS = ['1', '2', '3']
const DISPLAY_OPTIONS = ['App only', 'App + whiteboard']

// ─── Capacity Calculation ─────────────────────────────────────────────────────

function toMins(t: string): number {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function calcCapacity(f: Form): number {
  const courts = Number(f.num_courts) || 0
  const matchMins = Number(f.match_duration_minutes) || 40
  const warmup = Number(f.warm_up_minutes) || 10
  const slotMins = matchMins + warmup
  const minRestMins = (Number(f.min_rest_hours) || 3) * 60
  const maxPerDay = Number(f.max_matches_per_day) || 2

  let days = 1
  if (f.start_date && f.end_date) {
    const ms = new Date(f.end_date).getTime() - new Date(f.start_date).getTime()
    days = Math.max(1, Math.round(ms / 86400000) + 1)
  }

  // Session minutes
  let dailyMins = 0
  if (f.morning_start && f.lunch_start)
    dailyMins += Math.max(0, toMins(f.lunch_start) - toMins(f.morning_start))
  if (f.afternoon_start) {
    const end = f.has_dinner_break && f.dinner_start ? toMins(f.dinner_start)
      : f.has_evening_session && f.evening_start ? toMins(f.evening_start)
      : toMins(f.daily_end || '22:00')
    dailyMins += Math.max(0, end - toMins(f.afternoon_start))
  }
  if (f.has_evening_session && f.evening_start)
    dailyMins += Math.max(0, toMins(f.daily_end || '22:00') - toMins(f.evening_start))

  if (dailyMins <= 0 || courts <= 0 || slotMins <= 0) return 0

  // Total match slots
  const slotsPerDay = Math.floor(dailyMins / slotMins) * courts
  const totalSlots = slotsPerDay * days

  // Cap: how many matches can one player play?
  // Per day: limited by rest → floor((dailyMins - matchMins) / (matchMins + minRestMins)) + 1
  const maxByRest = Math.max(1, Math.floor((dailyMins - matchMins) / (matchMins + minRestMins)) + 1)
  const perDayCap = Math.min(maxPerDay, maxByRest)
  const playerMatchCap = perDayCap * days

  // Max players: total match slots → each match uses 2 player-slots
  const raw = Math.floor((totalSlots * 2) / playerMatchCap)
  if (raw < 2) return 0
  // Round to nearest power of 2 for clean brackets
  return Math.pow(2, Math.floor(Math.log2(raw)))
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

const inputCls = 'w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600 transition'
const labelCls = 'block text-[10px] font-bold tracking-widest text-neutral-500 uppercase mb-2'
const sectionCls = 'bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5'

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center gap-3 text-sm text-neutral-300"
    >
      <div className={`w-10 h-5 rounded-full transition relative ${value ? 'bg-red-700' : 'bg-neutral-700'}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${value ? 'left-5' : 'left-0.5'}`} />
      </div>
      {label}
    </button>
  )
}

function Check({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer text-sm text-neutral-300">
      <div
        onClick={() => onChange(!value)}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition flex-shrink-0 ${value ? 'bg-red-700 border-red-700' : 'border-neutral-600'}`}
      >
        {value && <span className="text-white text-[10px] font-bold">✓</span>}
      </div>
      {label}
    </label>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NewTournamentPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<Form>(() => {
    if (typeof window === 'undefined') return INITIAL
    try {
      const saved = localStorage.getItem('td_wizard_form')
      if (saved) return { ...INITIAL, ...JSON.parse(saved) }
    } catch {}
    return INITIAL
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Club search state
  const [clubQuery, setClubQuery] = useState('')
  const [clubOpen, setClubOpen] = useState(false)
  const [clubFreeText, setClubFreeText] = useState(false)
  const clubRef = useRef<HTMLDivElement>(null)

  const fuse = useMemo(() => new Fuse(CLUBS, { keys: ['name', 'city'], threshold: 0.4, minMatchCharLength: 1 }), [])
  const clubResults = useMemo<ClubEntry[]>(() => {
    if (!clubQuery.trim()) return CLUBS.slice(0, 8)
    return fuse.search(clubQuery).map(r => r.item).slice(0, 8)
  }, [clubQuery, fuse])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (clubRef.current && !clubRef.current.contains(e.target as Node)) setClubOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    localStorage.setItem('td_wizard_form', JSON.stringify(form))
  }, [form])

  const maxPlayers = useMemo(() => calcCapacity(form), [form])

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function validate(): string | null {
    if (step === 1) {
      if (!form.name.trim()) return 'Tournament name is required.'
      if (!form.venue_name.trim()) return 'Venue / club name is required.'
      if (!form.num_courts || Number(form.num_courts) < 1) return 'At least 1 court is required.'
    }
    if (step === 2) {
      if (!form.has_singles_draw && !form.has_doubles_draw) return 'Select at least one draw type (singles or doubles).'
    }
    if (step === 3) {
      if (!form.start_date) return 'Start date is required.'
      if (!form.end_date) return 'End date is required.'
      if (form.end_date < form.start_date) return 'End date must be after start date.'
      if (!form.morning_start) return 'Morning session start time is required.'
    }
    if (step === 4) {
      if (!form.td_email.trim()) return 'TD contact email is required.'
    }
    return null
  }

  function next() {
    const err = validate()
    if (err) { setError(err); return }
    setError(null)
    setStep(s => Math.min(s + 1, 5))
    window.scrollTo(0, 0)
  }

  function back() {
    setError(null)
    setStep(s => Math.max(s - 1, 1))
    window.scrollTo(0, 0)
  }

  async function handleSubmit() {
    setError(null)
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // 1. Find or create club
      let club_id: string | null = null
      if (form.venue_name.trim()) {
        const { data: existing } = await supabase
          .from('clubs')
          .select('id')
          .ilike('name', form.venue_name.trim())
          .maybeSingle()

        if (existing) {
          club_id = existing.id
        } else {
          const { data: newClub } = await supabase
            .from('clubs')
            .insert({
              td_id: user.id,
              name: form.venue_name.trim(),
              city: form.venue_city.trim() || null,
              province: form.venue_province.trim() || null,
              country: form.venue_country.trim() || null,
              num_courts: Number(form.num_courts) || 0,
              has_doubles_courts: form.has_doubles_courts,
              num_doubles_courts: form.has_doubles_courts ? Number(form.num_doubles_courts) : 0,
              surface_type: form.surface_type,
              glass_back_walls: form.glass_back_walls,
              num_locations: Number(form.num_locations) || 1,
            })
            .select('id')
            .single()
          club_id = newClub?.id ?? null
        }
      }

      // 2. Create tournament
      const court_entry_code = Math.random().toString(36).slice(2, 8).toUpperCase()
      const { data: tournament, error: tErr } = await supabase
        .from('tournaments')
        .insert({
          name: form.name.trim(),
          td_id: user.id,
          status: 'setup_pending',
          draw_type: form.draw_type,
          entry_fee: Number(form.singles_entry_fee) || 0,
          court_entry_code,
        })
        .select('id')
        .single()

      if (tErr || !tournament) throw new Error(tErr?.message ?? 'Failed to create tournament')

      // 3. Create tournament_details
      const { error: dErr } = await supabase
        .from('tournament_details')
        .insert({
          tournament_id: tournament.id,
          club_id,

          // Schedule
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          daily_start_time: form.morning_start || null,
          daily_end_time: form.daily_end || null,
          morning_start: form.morning_start || null,
          lunch_start: form.lunch_start || null,
          lunch_duration_mins: Number(form.lunch_duration_mins) || null,
          afternoon_start: form.afternoon_start || null,
          has_dinner_break: form.has_dinner_break,
          dinner_start: form.has_dinner_break ? (form.dinner_start || null) : null,
          dinner_duration_mins: form.has_dinner_break ? (Number(form.dinner_duration_mins) || null) : null,
          has_evening_session: form.has_evening_session,
          evening_start: form.has_evening_session ? (form.evening_start || null) : null,

          // Match params
          courts_available: Number(form.num_courts) || null,
          match_duration_minutes: Number(form.match_duration_minutes) || 40,
          warm_up_minutes: Number(form.warm_up_minutes) || 10,
          warmup_minutes: Number(form.warm_up_minutes) || 10,
          min_rest_hours: Number(form.min_rest_hours) || 3,
          min_rest_minutes: (Number(form.min_rest_hours) || 3) * 60,
          max_matches_per_day: Number(form.max_matches_per_day) || 2,
          forfeit_minutes: Number(form.forfeit_minutes) || 15,
          format: form.draw_type,
          max_players: maxPlayers || null,

          // Fees
          singles_entry_fee: form.singles_entry_fee ? Number(form.singles_entry_fee) : 0,
          doubles_entry_fee: form.has_doubles_draw && form.doubles_entry_fee ? Number(form.doubles_entry_fee) : 0,
          both_entry_fee: (form.has_singles_draw && form.has_doubles_draw && form.both_entry_fee) ? Number(form.both_entry_fee) : 0,

          // Draw
          has_singles_draw: form.has_singles_draw,
          has_doubles_draw: form.has_doubles_draw,
          has_doubles: form.has_doubles_draw,

          // Registration
          registration_opens: form.registration_opens || null,
          registration_deadline: form.registration_deadline || null,
          has_waitlist: form.has_waitlist,
          waitlist_spots: form.has_waitlist ? (Number(form.waitlist_spots) || null) : null,
          multi_division_allow_multiple: form.multi_division_allow_multiple,
          multi_division: form.multi_division_allow_multiple,

          // Prizes
          has_referee: form.has_referee,
          referee_required: form.has_referee,
          has_trophy: form.has_trophy,
          trophy_awarded: form.has_trophy,
          prize_purse: Number(form.prize_purse) || 0,
          has_player_gift: form.has_player_gift,
          player_gift_desc: form.has_player_gift ? (form.player_gift_desc.trim() || null) : null,
          sponsor_name: form.sponsor_name.trim() || null,
          has_social_event: form.has_social_event,
          social_event_time: form.has_social_event ? (form.social_event_time || null) : null,
          social_event_desc: form.has_social_event ? (form.social_event_desc.trim() || null) : null,
          tournament_notes: form.tournament_notes.trim() || null,

          // Communications
          td_email: form.td_email.trim() || null,
          td_phone_comm: form.td_phone_comm.trim() || null,
          auto_notify_draw: form.auto_notify_draw,
          auto_reminder_match: form.auto_reminder_match,
          reminder_hours: Number(form.reminder_hours) || 2,
          welcome_message: form.welcome_message.trim() || null,
          check_in_required: form.check_in_required,
          check_in_open_mins: form.check_in_required ? (Number(form.check_in_open_mins) || 60) : null,
          live_scoring: form.live_scoring,
          score_verification: form.score_verification,
          print_score_sheets: form.print_score_sheets,
          court_assignment_display: form.court_assignment_display,
        })

      if (dErr) throw new Error(dErr.message)
      localStorage.removeItem('td_wizard_form')
      router.push(`/td/tournaments/${tournament.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setSaving(false)
    }
  }

  const revenue = maxPlayers * (Number(form.singles_entry_fee) || 0)
  const platformFee = Math.round(revenue * 0.05 * 100) / 100
  const netTD = Math.round((revenue - platformFee) * 100) / 100

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Back */}
      <Link href="/td" className="text-xs text-neutral-500 hover:text-neutral-300 transition">← MY TOURNAMENTS</Link>
      <h1 className="text-2xl font-bold tracking-wide mt-3 mb-8">CREATE TOURNAMENT</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-10 overflow-x-auto pb-2">
        {STEPS.map((label, i) => {
          const n = i + 1
          const done = n < step
          const active = n === step
          return (
            <div key={n} className="flex items-center gap-1 flex-shrink-0">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest transition ${
                done ? 'bg-red-900/40 text-red-400'
                : active ? 'bg-red-700 text-white'
                : 'text-neutral-600'
              }`}>
                <span>{done ? '✓' : n}</span>
                <span className="hidden sm:block">{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`w-4 h-px ${n < step ? 'bg-red-700' : 'bg-neutral-800'}`} />}
            </div>
          )
        })}
      </div>

      {error && (
        <div className="mb-6 bg-red-900/20 border border-red-700/40 text-red-400 text-sm rounded-xl px-4 py-3 flex justify-between">
          {error}
          <button onClick={() => setError(null)} className="ml-3 text-red-600 hover:text-red-400">✕</button>
        </div>
      )}

      {/* ── STEP 1: BASICS ─────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          <div className={sectionCls}>
            <h2 className={labelCls}>Tournament Details</h2>
            <div>
              <label className={labelCls}>Tournament Name *</label>
              <input className={inputCls} placeholder="e.g. ONE BEACHIN' 2026" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Draw Format</label>
              <select className={inputCls} value={form.draw_type} onChange={e => set('draw_type', e.target.value)}>
                {DRAW_TYPES.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className={sectionCls}>
            <h2 className={labelCls}>Venue / Club</h2>
            <div>
              <label className={labelCls}>Club / Venue Name *</label>
              {clubFreeText ? (
                <div className="flex gap-2">
                  <input className={`${inputCls} flex-1`} placeholder="Club name" value={form.venue_name} onChange={e => set('venue_name', e.target.value)} />
                  <button type="button" onClick={() => { setClubFreeText(false); set('venue_name', '') }} className="text-[10px] text-neutral-500 hover:text-red-400 whitespace-nowrap px-2">← Search</button>
                </div>
              ) : (
                <div ref={clubRef} className="relative">
                  <input
                    className={inputCls}
                    value={clubOpen ? clubQuery : form.venue_name}
                    onFocus={() => { setClubOpen(true); setClubQuery('') }}
                    onChange={e => { setClubQuery(e.target.value); set('venue_name', e.target.value) }}
                    placeholder={form.venue_name || 'Search by club name or city…'}
                  />
                  {form.venue_name && !clubOpen && (
                    <button type="button" onClick={() => { set('venue_name', ''); set('venue_city', ''); set('venue_province', '') }} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-red-400">✕</button>
                  )}
                  {clubOpen && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                      {clubResults.map((c, i) => (
                        <button key={i} type="button" onMouseDown={e => e.preventDefault()}
                          onClick={() => { set('venue_name', c.name); set('venue_city', c.city); set('venue_province', c.region); set('venue_country', c.country); setClubOpen(false); setClubQuery('') }}
                          className="w-full text-left px-4 py-2.5 hover:bg-neutral-700 transition text-sm flex gap-2">
                          <span className="text-neutral-100">{c.name}</span>
                          <span className="text-neutral-500 text-xs">— {c.city}, {c.region}</span>
                        </button>
                      ))}
                      {clubResults.length === 0 && <p className="px-4 py-2.5 text-sm text-neutral-500">No clubs found</p>}
                      <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => { setClubFreeText(true); setClubOpen(false) }}
                        className="w-full text-left px-4 py-2.5 text-xs text-red-500 border-t border-neutral-700 hover:bg-neutral-700 transition">
                        + My club isn&apos;t listed — add it
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>City</label>
                <input className={inputCls} placeholder="e.g. Toronto" value={form.venue_city} onChange={e => set('venue_city', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Province / State</label>
                <input className={inputCls} placeholder="e.g. ON" value={form.venue_province} onChange={e => set('venue_province', e.target.value)} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Country</label>
              <input className={inputCls} placeholder="Canada" value={form.venue_country} onChange={e => set('venue_country', e.target.value)} />
            </div>
          </div>

          <div className={sectionCls}>
            <h2 className={labelCls}>Courts</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Singles Courts *</label>
                <input type="number" min="1" className={inputCls} value={form.num_courts} onChange={e => set('num_courts', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Number of Locations</label>
                <input type="number" min="1" className={inputCls} value={form.num_locations} onChange={e => set('num_locations', e.target.value)} />
              </div>
            </div>
            <Toggle value={form.has_doubles_courts} onChange={v => set('has_doubles_courts', v)} label="Doubles courts available" />
            {form.has_doubles_courts && (
              <div>
                <label className={labelCls}>Number of Doubles Courts</label>
                <input type="number" min="1" className={inputCls} value={form.num_doubles_courts} onChange={e => set('num_doubles_courts', e.target.value)} />
              </div>
            )}
            <div>
              <label className={labelCls}>Court Surface</label>
              <div className="flex gap-3">
                {SURFACES.map(s => (
                  <button key={s} type="button" onClick={() => set('surface_type', s)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition ${form.surface_type === s ? 'bg-red-700 border-red-700 text-white' : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <Check value={form.glass_back_walls} onChange={v => set('glass_back_walls', v)} label="Glass back wall" />
          </div>
        </div>
      )}

      {/* ── STEP 2: REGISTRATION & FEES ────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5">
          <div className={sectionCls}>
            <h2 className={labelCls}>Draw Type</h2>
            <Check value={form.has_singles_draw} onChange={v => set('has_singles_draw', v)} label="Singles draw" />
            <Check value={form.has_doubles_draw} onChange={v => set('has_doubles_draw', v)} label="Doubles draw" />
          </div>

          <div className={sectionCls}>
            <h2 className={labelCls}>Entry Fees</h2>
            {form.has_singles_draw && (
              <div>
                <label className={labelCls}>Singles Entry Fee ($)</label>
                <input type="number" min="0" step="0.01" className={inputCls} placeholder="0.00" value={form.singles_entry_fee} onChange={e => set('singles_entry_fee', e.target.value)} />
              </div>
            )}
            {form.has_doubles_draw && (
              <div>
                <label className={labelCls}>Doubles Entry Fee per Team ($)</label>
                <input type="number" min="0" step="0.01" className={inputCls} placeholder="0.00" value={form.doubles_entry_fee} onChange={e => set('doubles_entry_fee', e.target.value)} />
              </div>
            )}
            {form.has_singles_draw && form.has_doubles_draw && (
              <div>
                <label className={labelCls}>Singles + Doubles Combined Fee ($)</label>
                <p className="text-xs text-neutral-500 mb-2">For players entering both draws (discounted bundle)</p>
                <input type="number" min="0" step="0.01" className={inputCls} placeholder="0.00" value={form.both_entry_fee} onChange={e => set('both_entry_fee', e.target.value)} />
              </div>
            )}
            <div className="text-xs text-neutral-600 border-t border-neutral-800 pt-4">
              <p>Doubles partner is fixed for the entire tournament.</p>
              <p className="mt-1">Withdrawal policy: non-refundable deposit; remainder refunded before deadline.</p>
            </div>
          </div>

          <div className={sectionCls}>
            <h2 className={labelCls}>Registration</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Opens</label>
                <input type="date" className={inputCls} value={form.registration_opens} onChange={e => set('registration_opens', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Deadline</label>
                <input type="date" className={inputCls} value={form.registration_deadline} onChange={e => set('registration_deadline', e.target.value)} />
              </div>
            </div>
            <Toggle value={form.has_waitlist} onChange={v => set('has_waitlist', v)} label="Enable waitlist" />
            {form.has_waitlist && (
              <div>
                <label className={labelCls}>Waitlist Spots</label>
                <input type="number" min="1" className={inputCls} value={form.waitlist_spots} onChange={e => set('waitlist_spots', e.target.value)} />
              </div>
            )}
            <Toggle value={form.multi_division_allow_multiple} onChange={v => set('multi_division_allow_multiple', v)} label="Allow players to enter multiple divisions" />
          </div>

          <div className={sectionCls}>
            <h2 className={labelCls}>Prizes & Extras</h2>
            <Check value={form.has_referee} onChange={v => set('has_referee', v)} label="Referee required" />
            <Check value={form.has_trophy} onChange={v => set('has_trophy', v)} label="Trophy awarded" />
            <div>
              <label className={labelCls}>Cash Prize Purse ($0 = no cash)</label>
              <input type="number" min="0" className={inputCls} placeholder="0" value={form.prize_purse} onChange={e => set('prize_purse', e.target.value)} />
            </div>
            <Toggle value={form.has_player_gift} onChange={v => set('has_player_gift', v)} label="Player gift" />
            {form.has_player_gift && (
              <div>
                <label className={labelCls}>Gift Description</label>
                <input className={inputCls} placeholder="e.g. custom squash bag" value={form.player_gift_desc} onChange={e => set('player_gift_desc', e.target.value)} />
              </div>
            )}
            <div>
              <label className={labelCls}>Sponsor Name (optional)</label>
              <input className={inputCls} placeholder="e.g. Tecnifibre" value={form.sponsor_name} onChange={e => set('sponsor_name', e.target.value)} />
            </div>
          </div>

          <div className={sectionCls}>
            <h2 className={labelCls}>Post-Tournament</h2>
            <Toggle value={form.has_social_event} onChange={v => set('has_social_event', v)} label="Social event after tournament" />
            {form.has_social_event && (
              <>
                <div>
                  <label className={labelCls}>Social Event Time</label>
                  <input type="time" className={inputCls} value={form.social_event_time} onChange={e => set('social_event_time', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Description</label>
                  <input className={inputCls} placeholder="e.g. dinner at the club bar" value={form.social_event_desc} onChange={e => set('social_event_desc', e.target.value)} />
                </div>
              </>
            )}
            <div>
              <label className={labelCls}>Tournament Notes / Special Instructions</label>
              <textarea rows={4} className={`${inputCls} resize-none`} placeholder="Anything players should know..." value={form.tournament_notes} onChange={e => set('tournament_notes', e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: SCHEDULE ───────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-5">
          {/* Live capacity */}
          <div className="bg-red-900/20 border border-red-700/30 rounded-2xl px-5 py-4">
            <p className="text-[10px] font-bold tracking-widest text-red-500 uppercase mb-1">Live Capacity Estimate</p>
            <p className="text-3xl font-bold text-white">{maxPlayers > 0 ? maxPlayers : '—'} <span className="text-base font-normal text-neutral-400">players</span></p>
            <p className="text-xs text-neutral-500 mt-1">Updates as you fill in schedule fields below</p>
          </div>

          <div className={sectionCls}>
            <h2 className={labelCls}>Tournament Dates</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Start Date *</label>
                <input type="date" className={inputCls} value={form.start_date} onChange={e => set('start_date', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>End Date *</label>
                <input type="date" className={inputCls} value={form.end_date} onChange={e => set('end_date', e.target.value)} />
              </div>
            </div>
          </div>

          <div className={sectionCls}>
            <h2 className={labelCls}>Daily Schedule</h2>
            <div>
              <label className={labelCls}>Morning Session Start *</label>
              <input type="time" className={inputCls} value={form.morning_start} onChange={e => set('morning_start', e.target.value)} />
            </div>
            <Toggle
              value={form.has_fixed_lunch}
              onChange={v => {
                set('has_fixed_lunch', v)
                if (!v) set('lunch_duration_mins', '0')
              }}
              label="Fixed Lunch Break"
            />
            {form.has_fixed_lunch ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Lunch Break Start</label>
                  <input type="time" className={inputCls} value={form.lunch_start} onChange={e => set('lunch_start', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Lunch Duration (mins)</label>
                  <input type="number" min="15" step="15" className={inputCls} value={form.lunch_duration_mins} onChange={e => set('lunch_duration_mins', e.target.value)} />
                </div>
              </div>
            ) : (
              <p className="text-xs text-neutral-500">Rolling Lunch — players eat between matches, no fixed break deducted</p>
            )}
            <div>
              <label className={labelCls}>Afternoon Session Start</label>
              <input type="time" className={inputCls} value={form.afternoon_start} onChange={e => set('afternoon_start', e.target.value)} />
            </div>

            <Toggle value={form.has_dinner_break} onChange={v => set('has_dinner_break', v)} label="Dinner break" />
            {form.has_dinner_break && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Dinner Break Start</label>
                  <input type="time" className={inputCls} value={form.dinner_start} onChange={e => set('dinner_start', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Dinner Duration (mins)</label>
                  <input type="number" min="0" step="15" className={inputCls} value={form.dinner_duration_mins} onChange={e => set('dinner_duration_mins', e.target.value)} />
                </div>
              </div>
            )}

            <Toggle value={form.has_evening_session} onChange={v => set('has_evening_session', v)} label="Evening session" />
            {form.has_evening_session && (
              <div>
                <label className={labelCls}>Evening Session Start</label>
                <input type="time" className={inputCls} value={form.evening_start} onChange={e => set('evening_start', e.target.value)} />
              </div>
            )}
            <div>
              <label className={labelCls}>End of Play</label>
              <input type="time" className={inputCls} value={form.daily_end} onChange={e => set('daily_end', e.target.value)} />
            </div>
          </div>

          <div className={sectionCls}>
            <h2 className={labelCls}>Match Timing</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Match Duration (mins)</label>
                <input type="number" min="10" step="5" className={inputCls} value={form.match_duration_minutes} onChange={e => set('match_duration_minutes', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Warm-up Time (mins)</label>
                <input type="number" min="0" step="5" className={inputCls} value={form.warm_up_minutes} onChange={e => set('warm_up_minutes', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Min Rest Between Matches (hours)</label>
                <p className="text-xs text-neutral-600 mb-2">US Squash standard: 3 hrs</p>
                <input type="number" min="1" step="0.5" className={inputCls} value={form.min_rest_hours} onChange={e => set('min_rest_hours', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Max Matches Per Player Per Day</label>
                <p className="text-xs text-neutral-600 mb-2">US Squash standard: 2</p>
                <input type="number" min="1" max="5" className={inputCls} value={form.max_matches_per_day} onChange={e => set('max_matches_per_day', e.target.value)} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Forfeit Rule (no-show = forfeit)</label>
              <div className="flex gap-3">
                {FORFEIT_OPTIONS.map(o => (
                  <button key={o} type="button" onClick={() => set('forfeit_minutes', o)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition ${form.forfeit_minutes === o ? 'bg-red-700 border-red-700 text-white' : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'}`}>
                    {o} min
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={sectionCls}>
            <h2 className={labelCls}>Max Players</h2>
            <div className="bg-neutral-800 rounded-xl px-5 py-4">
              <p className="text-xs text-neutral-500 mb-1">Auto-calculated from your schedule above</p>
              <p className="text-2xl font-bold text-red-500">{maxPlayers > 0 ? maxPlayers : '—'}</p>
              <p className="text-xs text-neutral-600 mt-1">Fill in schedule details to see capacity</p>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: COMMUNICATIONS & TOURNAMENT DAY ────────────────────────── */}
      {step === 4 && (
        <div className="space-y-5">
          <div className={sectionCls}>
            <h2 className={labelCls}>TD Contact</h2>
            <div>
              <label className={labelCls}>TD Email *</label>
              <input type="email" className={inputCls} placeholder="you@example.com" value={form.td_email} onChange={e => set('td_email', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>TD Phone</label>
              <input type="tel" className={inputCls} placeholder="+1 555 000 0000" value={form.td_phone_comm} onChange={e => set('td_phone_comm', e.target.value)} />
            </div>
          </div>

          <div className={sectionCls}>
            <h2 className={labelCls}>Player Notifications</h2>
            <Toggle value={form.auto_notify_draw} onChange={v => set('auto_notify_draw', v)} label="Notify players when draw is published" />
            <Toggle value={form.auto_reminder_match} onChange={v => set('auto_reminder_match', v)} label="Send match reminder to players" />
            {form.auto_reminder_match && (
              <div>
                <label className={labelCls}>Reminder how many hours before match?</label>
                <div className="flex gap-3">
                  {REMINDER_OPTIONS.map(o => (
                    <button key={o} type="button" onClick={() => set('reminder_hours', o)}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition ${form.reminder_hours === o ? 'bg-red-700 border-red-700 text-white' : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'}`}>
                      {o}h
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className={labelCls}>Welcome Message (shown on registration)</label>
              <textarea rows={3} className={`${inputCls} resize-none`} placeholder="Welcome to the tournament! Here's what to expect..." value={form.welcome_message} onChange={e => set('welcome_message', e.target.value)} />
            </div>
          </div>

          <div className={sectionCls}>
            <h2 className={labelCls}>Tournament Day</h2>
            <Toggle value={form.check_in_required} onChange={v => set('check_in_required', v)} label="Check-in required" />
            {form.check_in_required && (
              <div>
                <label className={labelCls}>Check-in opens (mins before first match)</label>
                <input type="number" min="15" step="15" className={inputCls} value={form.check_in_open_mins} onChange={e => set('check_in_open_mins', e.target.value)} />
              </div>
            )}
            <Toggle value={form.live_scoring} onChange={v => set('live_scoring', v)} label="Live scoring (players self-report)" />
            {form.live_scoring && (
              <Toggle value={form.score_verification} onChange={v => set('score_verification', v)} label="Score verification (both players must confirm)" />
            )}
            <Toggle value={form.print_score_sheets} onChange={v => set('print_score_sheets', v)} label="Print score sheets" />
            <div>
              <label className={labelCls}>Court Assignment Display</label>
              <div className="flex gap-3">
                {DISPLAY_OPTIONS.map(o => (
                  <button key={o} type="button" onClick={() => set('court_assignment_display', o)}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition ${form.court_assignment_display === o ? 'bg-red-700 border-red-700 text-white' : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'}`}>
                    {o}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 5: SUMMARY ────────────────────────────────────────────────── */}
      {step === 5 && (
        <div className="space-y-5">
          {/* Financials */}
          <div className="bg-red-900/20 border border-red-700/30 rounded-2xl p-6 space-y-3">
            <h2 className={labelCls}>Estimated Financials</h2>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Max players × ${form.singles_entry_fee || '0'} entry</span>
              <span className="font-bold">${revenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">SQSH.LIFE platform fee (5%)</span>
              <span className="text-red-400">−${platformFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-red-700/30 pt-3">
              <span className="text-neutral-200 font-bold">Net to TD</span>
              <span className="font-bold text-green-400">${netTD.toFixed(2)}</span>
            </div>
            {Number(form.prize_purse) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">Prize purse</span>
                <span className="font-bold">${Number(form.prize_purse).toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Full recap */}
          {[
            { title: 'Basics', rows: [
              ['Tournament', form.name],
              ['Format', form.draw_type],
              ['Venue', form.venue_name || '—'],
              ['Location', [form.venue_city, form.venue_province, form.venue_country].filter(Boolean).join(', ') || '—'],
              ['Singles Courts', form.num_courts],
              ['Doubles Courts', form.has_doubles_courts ? form.num_doubles_courts : 'None'],
              ['Surface', form.surface_type],
              ['Glass Back Wall', form.glass_back_walls ? 'Yes' : 'No'],
              ['Locations', form.num_locations],
            ]},
            { title: 'Registration & Fees', rows: [
              ['Singles Draw', form.has_singles_draw ? 'Yes' : 'No'],
              ['Doubles Draw', form.has_doubles_draw ? 'Yes' : 'No'],
              ['Singles Fee', form.singles_entry_fee ? `$${form.singles_entry_fee}` : '—'],
              ['Doubles Fee', form.doubles_entry_fee ? `$${form.doubles_entry_fee}` : '—'],
              ['Waitlist', form.has_waitlist ? `Yes (${form.waitlist_spots} spots)` : 'No'],
              ['Multi-division', form.multi_division_allow_multiple ? 'Yes' : 'No'],
              ['Reg Opens', form.registration_opens || '—'],
              ['Reg Deadline', form.registration_deadline || '—'],
              ['Referee', form.has_referee ? 'Yes' : 'No'],
              ['Trophy', form.has_trophy ? 'Yes' : 'No'],
              ['Prize Purse', `$${form.prize_purse || '0'}`],
              ['Player Gift', form.has_player_gift ? (form.player_gift_desc || 'Yes') : 'No'],
              ['Sponsor', form.sponsor_name || '—'],
              ['Social Event', form.has_social_event ? `Yes${form.social_event_time ? ` @ ${form.social_event_time}` : ''}` : 'No'],
            ]},
            { title: 'Schedule', rows: [
              ['Dates', form.start_date && form.end_date ? `${form.start_date} → ${form.end_date}` : '—'],
              ['Morning Start', form.morning_start || '—'],
              ['Lunch', form.has_fixed_lunch ? `${form.lunch_start} (${form.lunch_duration_mins} min fixed)` : 'Rolling lunch'],
              ['Afternoon Start', form.afternoon_start || '—'],
              ['Dinner Break', form.has_dinner_break ? `${form.dinner_start} (${form.dinner_duration_mins} min)` : 'No'],
              ['Evening Session', form.has_evening_session ? form.evening_start : 'No'],
              ['End of Play', form.daily_end],
              ['Match Duration', `${form.match_duration_minutes} min`],
              ['Warm-up', `${form.warm_up_minutes} min`],
              ['Min Rest', `${form.min_rest_hours} hrs`],
              ['Max Matches/Day', form.max_matches_per_day],
              ['Forfeit Rule', `${form.forfeit_minutes} min no-show`],
              ['Estimated Capacity', maxPlayers > 0 ? `${maxPlayers} players` : '—'],
            ]},
            { title: 'Communications & Day-of', rows: [
              ['TD Email', form.td_email || '—'],
              ['TD Phone', form.td_phone_comm || '—'],
              ['Auto-notify Draw', form.auto_notify_draw ? 'Yes' : 'No'],
              ['Match Reminder', form.auto_reminder_match ? `Yes — ${form.reminder_hours}h before` : 'No'],
              ['Check-in', form.check_in_required ? `Yes — opens ${form.check_in_open_mins} min before` : 'No'],
              ['Live Scoring', form.live_scoring ? 'Yes' : 'No'],
              ['Score Verification', form.score_verification ? 'Yes' : 'No'],
              ['Print Score Sheets', form.print_score_sheets ? 'Yes' : 'No'],
              ['Court Display', form.court_assignment_display],
            ]},
          ].map(({ title, rows }) => (
            <div key={title} className={sectionCls}>
              <h2 className={labelCls}>{title}</h2>
              <div className="space-y-2">
                {rows.map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm gap-4">
                    <span className="text-neutral-500 shrink-0">{k}</span>
                    <span className="text-neutral-200 text-right">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-8 pb-10">
        {step > 1 && (
          <button type="button" onClick={back}
            className="flex-1 border border-neutral-700 text-neutral-400 text-sm font-bold tracking-widest py-3.5 rounded-xl hover:border-neutral-500 transition">
            BACK
          </button>
        )}
        {step < 5 ? (
          <button type="button" onClick={next}
            className="flex-1 bg-red-700 hover:bg-red-600 text-white text-sm font-bold tracking-widest py-3.5 rounded-xl transition">
            NEXT
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={saving}
            className="flex-1 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold tracking-widest py-3.5 rounded-xl transition">
            {saving ? 'CREATING...' : 'CREATE TOURNAMENT'}
          </button>
        )}
      </div>
    </div>
  )
}
