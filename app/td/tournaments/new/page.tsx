'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Fuse from 'fuse.js'
import { createClient } from '@/lib/supabase/client'
import {
  buildClubPayload,
  buildTournamentDetailsPayload,
  calcScheduleMaxPlayers,
  type DaySchedule,
  type WizardForm,
} from '@/lib/td/flutterParity'
import CLUBS_RAW from '../../../../squash_clubs.json'

type ClubEntry = { name: string; city: string; region: string; country: string }
const CLUBS = CLUBS_RAW as ClubEntry[]

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = ['BASICS', 'SCHEDULE', 'REG & FEES', 'PRIZES', 'COMMS', 'SUMMARY']
const FORFEIT_OPTIONS = ['10', '15', '20']
const REMINDER_OPTIONS = ['1', '2', '3']
const DISPLAY_OPTIONS = ['App only', 'App + whiteboard']
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ─── Initial Form State ───────────────────────────────────────────────────────

type Form = WizardForm

const INITIAL: Form = {
  // Step 1
  name: '',
  venue_name: '', venue_city: '', venue_province: '', venue_country: 'Canada',
  num_courts: '4',
  has_doubles_courts: false, num_doubles_courts: '0',

  // Step 2
  start_date: '', end_date: '',
  day_schedules: [],
  rolling_lunch: true,
  lunch_break_duration_mins: '60',
  match_duration_minutes: '40',
  warm_up_minutes: '10',
  min_rest_hours: '3',
  max_matches_per_day: '2',

  // Step 3
  has_singles_draw: true, singles_entry_fee: '',
  has_doubles_draw: false, doubles_entry_fee: '',
  both_entry_fee: '',
  has_waitlist: false, waitlist_spots: '10',
  multi_division_allow_multiple: false,
  registration_opens: '', registration_deadline: '',
  forfeit_minutes: '15',

  // Step 4
  has_referee: false, has_trophy: true,
  prize_purse: '0',
  has_player_gift: false, player_gift_desc: '',
  sponsor_name: '',
  has_social_event: false, social_event_time: '', social_event_desc: '',
  tournament_notes: '',

  // Step 5
  td_email: '', td_phone_comm: '',
  auto_notify_draw: true,
  auto_reminder_match: true, reminder_hours: '2',
  welcome_message: '',
  check_in_required: true, check_in_open_mins: '60',
  live_scoring: false,
  score_verification: false,
  print_score_sheets: false,
  court_assignment_display: 'App only',

  // Legacy/DB-compat
  draw_type: 'Knockout + Plate',
  surface_type: 'Plaster', glass_back_walls: false, num_locations: '1',
  has_fixed_lunch: false, lunch_start: '12:00', lunch_duration_mins: '60',
  afternoon_start: '13:00',
  has_dinner_break: false, dinner_start: '18:00', dinner_duration_mins: '60',
  has_evening_session: false, evening_start: '19:00',
  daily_end: '22:00', morning_start: '12:00',
}

// ─── Day Schedule Generation ──────────────────────────────────────────────────

function generateDaySchedules(startDate: string, endDate: string): DaySchedule[] {
  if (!startDate || !endDate) return []
  const [sy, sm, sd] = startDate.split('-').map(Number)
  const [ey, em, ed] = endDate.split('-').map(Number)
  const s = new Date(sy, sm - 1, sd)
  const e = new Date(ey, em - 1, ed)
  if (e < s) return []
  const totalDays = Math.round((e.getTime() - s.getTime()) / 86400000) + 1
  const result: DaySchedule[] = []
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(sy, sm - 1, sd + i)
    const label = `Day ${i + 1} — ${DOW[d.getDay()]} ${MON[d.getMonth()]} ${d.getDate()}`
    let start_time = '08:00'
    let end_time = '18:00'
    if (totalDays === 1 || i === 0) {
      start_time = '12:00'; end_time = '21:00'
    } else if (i === totalDays - 1) {
      start_time = '09:00'; end_time = '14:00'
    }
    result.push({ label, start_time, end_time })
  }
  return result
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

const inputCls = 'w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600 transition'
const labelCls = 'block text-[10px] font-bold tracking-widest text-neutral-500 uppercase mb-2'
const sectionCls = 'bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5'
const readOnlyCls = 'w-full bg-neutral-800/50 border border-neutral-700/50 rounded-xl px-4 py-3 text-sm text-neutral-400 cursor-default'

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="flex items-center gap-3 text-sm text-neutral-300">
      <div className={`w-10 h-5 rounded-full transition relative flex-shrink-0 ${value ? 'bg-red-700' : 'bg-neutral-700'}`}>
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

function SegButtons({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      {options.map(o => (
        <button key={o} type="button" onClick={() => onChange(o)}
          className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition ${value === o ? 'bg-red-700 border-red-700 text-white' : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'}`}>
          {o}
        </button>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NewTournamentPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<Form>(() => {
    if (typeof window === 'undefined') return INITIAL
    try {
      const saved = localStorage.getItem('td_wizard_form_v2')
      if (saved) {
        const p = JSON.parse(saved) as Partial<Form>
        return { ...INITIAL, ...p }
      }
    } catch { /* ignore */ }
    return INITIAL
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Club search
  const [clubQuery, setClubQuery] = useState('')
  const [clubOpen, setClubOpen] = useState(false)
  const [clubFreeText, setClubFreeText] = useState(false)
  const clubRef = useRef<HTMLDivElement>(null)

  const fuse = useMemo(() => new Fuse(CLUBS, { keys: ['name', 'city'], threshold: 0.4, minMatchCharLength: 1 }), [])
  const clubResults = useMemo<ClubEntry[]>(() => {
    if (!clubQuery.trim()) return CLUBS.slice(0, 8)
    return fuse.search(clubQuery).map(r => r.item).slice(0, 8)
  }, [clubQuery, fuse])

  // Close club dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (clubRef.current && !clubRef.current.contains(e.target as Node)) setClubOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Persist form to localStorage
  useEffect(() => {
    localStorage.setItem('td_wizard_form_v2', JSON.stringify(form))
  }, [form])

  // Auto-generate day_schedules when dates change
  useEffect(() => {
    if (form.start_date && form.end_date) {
      const generated = generateDaySchedules(form.start_date, form.end_date)
      setForm(prev => ({ ...prev, day_schedules: generated }))
    } else {
      setForm(prev => ({ ...prev, day_schedules: [] }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.start_date, form.end_date])

  const maxPlayers = useMemo(() => calcScheduleMaxPlayers(form), [form])

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function updateDaySchedule(idx: number, field: 'start_time' | 'end_time', val: string) {
    setForm(prev => {
      const days = prev.day_schedules.map((d, i) => i === idx ? { ...d, [field]: val } : d)
      return { ...prev, day_schedules: days }
    })
  }

  function validate(): string | null {
    if (step === 1) {
      if (!form.name.trim()) return 'Tournament name is required.'
      if (!form.venue_name.trim()) return 'Venue / club name is required.'
      if (!form.num_courts || Number(form.num_courts) < 1) return 'At least 1 singles court is required.'
    }
    if (step === 2) {
      if (!form.start_date) return 'Start date is required.'
      if (!form.end_date) return 'End date is required.'
      if (form.end_date < form.start_date) return 'End date must be on or after start date.'
      if (form.day_schedules.length === 0) return 'Schedule could not be generated — check your dates.'
      for (const d of form.day_schedules) {
        if (!d.start_time || !d.end_time) return `Missing times for ${d.label}.`
        if (d.end_time <= d.start_time) return `End time must be after start time for ${d.label}.`
      }
    }
    if (step === 3) {
      if (!form.has_singles_draw && !form.has_doubles_draw) return 'Select at least one draw type (singles or doubles).'
    }
    if (step === 5) {
      if (!form.td_email.trim()) return 'TD contact email is required.'
    }
    return null
  }

  function next() {
    const err = validate()
    if (err) { setError(err); return }
    setError(null)
    setStep(s => Math.min(s + 1, 6))
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
          .from('clubs').select('id').ilike('name', form.venue_name.trim()).maybeSingle()
        if (existing) {
          club_id = existing.id
        } else {
          const { data: newClub } = await supabase
            .from('clubs').insert(buildClubPayload(user.id, form)).select('id').single()
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
          status: 'setup_complete',
          draw_type: form.draw_type,
          entry_fee: form.singles_entry_fee ? Number(form.singles_entry_fee) : 0,
          court_entry_code,
        })
        .select('id')
        .single()
      if (tErr || !tournament) throw new Error(tErr?.message ?? 'Failed to create tournament')

      // 3. Create tournament_details
      const { error: dErr } = await supabase
        .from('tournament_details')
        .insert(buildTournamentDetailsPayload(tournament.id, club_id, form))
      if (dErr) throw new Error(dErr.message)

      localStorage.removeItem('td_wizard_form_v2')
      router.push(`/td/tournaments/${tournament.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setSaving(false)
    }
  }

  const singlesFee = Number(form.singles_entry_fee) || 0
  const revenue = maxPlayers * singlesFee
  const platformFee = Math.round(revenue * 0.05 * 100) / 100
  const netTD = Math.round((revenue - platformFee) * 100) / 100

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
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
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold tracking-widest transition ${
                done ? 'bg-red-900/40 text-red-400' : active ? 'bg-red-700 text-white' : 'text-neutral-600'
              }`}>
                <span>{done ? '✓' : n}</span>
                <span className="hidden sm:block">{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`w-3 h-px ${n < step ? 'bg-red-700' : 'bg-neutral-800'}`} />}
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
            <h2 className={labelCls}>Tournament</h2>
            <div>
              <label className={labelCls}>Tournament Name *</label>
              <input className={inputCls} placeholder="e.g. ONE BEACHIN' 2026" value={form.name} onChange={e => set('name', e.target.value)} />
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
            <div>
              <label className={labelCls}>Singles Courts *</label>
              <input type="number" min="1" className={inputCls} value={form.num_courts} onChange={e => set('num_courts', e.target.value)} />
            </div>
            <Toggle value={form.has_doubles_courts} onChange={v => set('has_doubles_courts', v)} label="Doubles courts available" />
            {form.has_doubles_courts && (
              <div>
                <label className={labelCls}>Number of Doubles Courts</label>
                <input type="number" min="1" className={inputCls} value={form.num_doubles_courts} onChange={e => set('num_doubles_courts', e.target.value)} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 2: SCHEDULE ───────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5">
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

          {form.day_schedules.length > 0 && (
            <div className={sectionCls}>
              <h2 className={labelCls}>Daily Start & End Times</h2>
              <p className="text-xs text-neutral-500 -mt-2">Each day runs independently. Adjust as needed.</p>
              <div className="space-y-3">
                {form.day_schedules.map((day, idx) => (
                  <div key={idx} className="bg-neutral-800 rounded-xl px-4 py-3">
                    <p className="text-xs font-semibold text-neutral-400 mb-2.5">{day.label}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold tracking-widest text-neutral-600 uppercase mb-1">Start</label>
                        <input type="time" className={inputCls} value={day.start_time} onChange={e => updateDaySchedule(idx, 'start_time', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold tracking-widest text-neutral-600 uppercase mb-1">End</label>
                        <input type="time" className={inputCls} value={day.end_time} onChange={e => updateDaySchedule(idx, 'end_time', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={sectionCls}>
            <h2 className={labelCls}>Lunch</h2>
            <Toggle
              value={form.rolling_lunch}
              onChange={v => set('rolling_lunch', v)}
              label="Rolling Lunch"
            />
            <p className="text-xs text-neutral-500">
              {form.rolling_lunch
                ? 'Players eat between matches — no break deducted from playing time.'
                : 'Fixed lunch break — duration deducted from each day\'s playing time.'}
            </p>
            {!form.rolling_lunch && (
              <div>
                <label className={labelCls}>Lunch Break Duration (minutes)</label>
                <input type="number" min="15" step="15" className={inputCls} value={form.lunch_break_duration_mins} onChange={e => set('lunch_break_duration_mins', e.target.value)} />
              </div>
            )}
          </div>

          <div className={sectionCls}>
            <h2 className={labelCls}>Match Timing</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Match Duration (min)</label>
                <input type="number" min="10" step="5" className={inputCls} value={form.match_duration_minutes} onChange={e => set('match_duration_minutes', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Warm-up Time (min)</label>
                <input type="number" min="0" step="5" className={inputCls} value={form.warm_up_minutes} onChange={e => set('warm_up_minutes', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Min Rest Between Matches (hrs)</label>
                <p className="text-[10px] text-neutral-600 mb-2">US Squash standard: 3 hrs</p>
                <input type="number" min="1" step="0.5" className={inputCls} value={form.min_rest_hours} onChange={e => set('min_rest_hours', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Max Matches Per Player / Day</label>
                <p className="text-[10px] text-neutral-600 mb-2">US Squash standard: 2</p>
                <input type="number" min="1" max="5" className={inputCls} value={form.max_matches_per_day} onChange={e => set('max_matches_per_day', e.target.value)} />
              </div>
            </div>
          </div>

          {/* MAX PLAYERS — live, prominent */}
          <div className="bg-red-950/60 border-2 border-red-700/50 rounded-2xl px-6 py-6 text-center">
            <p className="text-[10px] font-bold tracking-widest text-red-500 uppercase mb-2">Max Players (Bracket Size)</p>
            <p className="text-6xl font-black text-white leading-none">
              {maxPlayers > 0 ? maxPlayers : '—'}
            </p>
            <p className="text-xs text-neutral-400 mt-3">
              {maxPlayers > 0
                ? `${maxPlayers}-player draw · updates live as you adjust the schedule above`
                : 'Set dates and times above to calculate capacity'}
            </p>
          </div>
        </div>
      )}

      {/* ── STEP 3: REGISTRATION & FEES ────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-5">
          {/* Max players read-only */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase mb-1">Max Players (from Schedule)</p>
              <p className="text-3xl font-black text-white">{maxPlayers > 0 ? maxPlayers : '—'}</p>
            </div>
            <button type="button" onClick={() => setStep(2)} className="text-[10px] text-neutral-500 hover:text-red-400 transition tracking-widest uppercase">Edit Schedule</button>
          </div>

          <div className={sectionCls}>
            <h2 className={labelCls}>Draw Type</h2>
            <Check value={form.has_singles_draw} onChange={v => set('has_singles_draw', v)} label="Singles draw" />
            {form.has_singles_draw && (
              <div>
                <label className={labelCls}>Singles Entry Fee ($)</label>
                <input type="number" min="0" step="0.01" className={inputCls} placeholder="0.00" value={form.singles_entry_fee} onChange={e => set('singles_entry_fee', e.target.value)} />
              </div>
            )}
            <Check value={form.has_doubles_draw} onChange={v => set('has_doubles_draw', v)} label="Doubles draw" />
            {form.has_doubles_draw && (
              <div>
                <label className={labelCls}>Doubles Entry Fee per Team ($)</label>
                <input type="number" min="0" step="0.01" className={inputCls} placeholder="0.00" value={form.doubles_entry_fee} onChange={e => set('doubles_entry_fee', e.target.value)} />
              </div>
            )}
            {form.has_singles_draw && form.has_doubles_draw && (
              <div>
                <label className={labelCls}>Singles + Doubles Combined Fee ($)</label>
                <p className="text-xs text-neutral-500 mb-2">For players entering both draws</p>
                <input type="number" min="0" step="0.01" className={inputCls} placeholder="0.00" value={form.both_entry_fee} onChange={e => set('both_entry_fee', e.target.value)} />
              </div>
            )}
          </div>

          <div className={sectionCls}>
            <h2 className={labelCls}>Waitlist & Divisions</h2>
            <Toggle value={form.has_waitlist} onChange={v => set('has_waitlist', v)} label="Enable waitlist" />
            {form.has_waitlist && (
              <div>
                <label className={labelCls}>Waitlist Spots</label>
                <input type="number" min="1" className={inputCls} value={form.waitlist_spots} onChange={e => set('waitlist_spots', e.target.value)} />
              </div>
            )}
            <Toggle value={form.multi_division_allow_multiple} onChange={v => set('multi_division_allow_multiple', v)} label="Allow multiple divisions" />
          </div>

          <div className={sectionCls}>
            <h2 className={labelCls}>Registration Dates</h2>
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
          </div>

          <div className={sectionCls}>
            <h2 className={labelCls}>Forfeit Rule</h2>
            <p className="text-xs text-neutral-500 -mt-2">No-show after how many minutes = forfeit?</p>
            <SegButtons options={FORFEIT_OPTIONS.map(o => `${o} min`)} value={`${form.forfeit_minutes} min`} onChange={v => set('forfeit_minutes', v.replace(' min', ''))} />
          </div>
        </div>
      )}

      {/* ── STEP 4: PRIZES & EXTRAS ────────────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-5">
          <div className={sectionCls}>
            <h2 className={labelCls}>Awards & Officials</h2>
            <Check value={form.has_referee} onChange={v => set('has_referee', v)} label="Referee required" />
            <Check value={form.has_trophy} onChange={v => set('has_trophy', v)} label="Trophy awarded" />
            <div>
              <label className={labelCls}>Cash Prize Purse ($0 = no cash prize)</label>
              <input type="number" min="0" className={inputCls} placeholder="0" value={form.prize_purse} onChange={e => set('prize_purse', e.target.value)} />
            </div>
          </div>

          <div className={sectionCls}>
            <h2 className={labelCls}>Player Extras</h2>
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
              <label className={labelCls}>Tournament Notes</label>
              <textarea rows={4} className={`${inputCls} resize-none`} placeholder="Anything players should know..." value={form.tournament_notes} onChange={e => set('tournament_notes', e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 5: COMMUNICATIONS & TOURNAMENT DAY ────────────────────────── */}
      {step === 5 && (
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
            <Toggle value={form.auto_notify_draw} onChange={v => set('auto_notify_draw', v)} label="Auto-notify players when draw is published" />
            <Toggle value={form.auto_reminder_match} onChange={v => set('auto_reminder_match', v)} label="Auto-reminder before each match" />
            {form.auto_reminder_match && (
              <div>
                <label className={labelCls}>Remind how many hours before match?</label>
                <SegButtons options={REMINDER_OPTIONS.map(o => `${o}h`)} value={`${form.reminder_hours}h`} onChange={v => set('reminder_hours', v.replace('h', ''))} />
              </div>
            )}
            <div>
              <label className={labelCls}>Custom Welcome Message</label>
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
              <SegButtons options={DISPLAY_OPTIONS} value={form.court_assignment_display} onChange={v => set('court_assignment_display', v)} />
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 6: SUMMARY ────────────────────────────────────────────────── */}
      {step === 6 && (
        <div className="space-y-5">
          {/* Financials */}
          <div className="bg-red-950/40 border border-red-700/30 rounded-2xl p-6 space-y-3">
            <h2 className={labelCls}>Estimated Financials</h2>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">{maxPlayers} players × ${singlesFee.toFixed(2)} singles entry</span>
              <span className="font-bold">${revenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">SQSH.LIFE platform fee (5%)</span>
              <span className="text-red-400">−${platformFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-red-700/30 pt-3">
              <span className="text-neutral-100 font-bold">Net to TD</span>
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
            {
              title: 'Basics',
              rows: [
                ['Tournament', form.name || '—'],
                ['Venue', form.venue_name || '—'],
                ['Location', [form.venue_city, form.venue_province, form.venue_country].filter(Boolean).join(', ') || '—'],
                ['Singles Courts', form.num_courts],
                ['Doubles Courts', form.has_doubles_courts ? form.num_doubles_courts : 'None'],
              ],
            },
            {
              title: 'Schedule',
              rows: [
                ['Dates', form.start_date && form.end_date ? `${form.start_date} → ${form.end_date}` : '—'],
                ['Days', form.day_schedules.length > 0 ? `${form.day_schedules.length} day${form.day_schedules.length > 1 ? 's' : ''}` : '—'],
                ['Lunch', form.rolling_lunch ? 'Rolling lunch' : `Fixed break — ${form.lunch_break_duration_mins} min`],
                ['Match Duration', `${form.match_duration_minutes} min`],
                ['Warm-up', `${form.warm_up_minutes} min`],
                ['Min Rest', `${form.min_rest_hours} hrs`],
                ['Max Matches/Day', form.max_matches_per_day],
                ['Max Players', maxPlayers > 0 ? `${maxPlayers}` : '—'],
              ],
            },
            {
              title: 'Registration & Fees',
              rows: [
                ['Singles Draw', form.has_singles_draw ? `Yes — $${form.singles_entry_fee || '0'}` : 'No'],
                ['Doubles Draw', form.has_doubles_draw ? `Yes — $${form.doubles_entry_fee || '0'}/team` : 'No'],
                ['Waitlist', form.has_waitlist ? `Yes (${form.waitlist_spots} spots)` : 'No'],
                ['Multiple Divisions', form.multi_division_allow_multiple ? 'Yes' : 'No'],
                ['Reg Opens', form.registration_opens || '—'],
                ['Reg Deadline', form.registration_deadline || '—'],
                ['Forfeit Rule', `${form.forfeit_minutes} min no-show`],
              ],
            },
            {
              title: 'Prizes & Extras',
              rows: [
                ['Referee', form.has_referee ? 'Yes' : 'No'],
                ['Trophy', form.has_trophy ? 'Yes' : 'No'],
                ['Prize Purse', `$${form.prize_purse || '0'}`],
                ['Player Gift', form.has_player_gift ? (form.player_gift_desc || 'Yes') : 'No'],
                ['Sponsor', form.sponsor_name || '—'],
                ['Social Event', form.has_social_event ? `Yes${form.social_event_time ? ` @ ${form.social_event_time}` : ''}` : 'No'],
              ],
            },
            {
              title: 'Communications & Day-of',
              rows: [
                ['TD Email', form.td_email || '—'],
                ['TD Phone', form.td_phone_comm || '—'],
                ['Auto-notify Draw', form.auto_notify_draw ? 'Yes' : 'No'],
                ['Match Reminder', form.auto_reminder_match ? `Yes — ${form.reminder_hours}h before` : 'No'],
                ['Check-in', form.check_in_required ? `Yes — opens ${form.check_in_open_mins} min before` : 'No'],
                ['Live Scoring', form.live_scoring ? 'Yes' : 'No'],
                ['Score Verification', form.score_verification ? 'Yes' : 'No'],
                ['Print Score Sheets', form.print_score_sheets ? 'Yes' : 'No'],
                ['Court Display', form.court_assignment_display],
              ],
            },
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

          {/* Per-day schedule recap */}
          {form.day_schedules.length > 0 && (
            <div className={sectionCls}>
              <h2 className={labelCls}>Day-by-Day Schedule</h2>
              <div className="space-y-2">
                {form.day_schedules.map((d, i) => (
                  <div key={i} className="flex justify-between text-sm gap-4">
                    <span className="text-neutral-500">{d.label}</span>
                    <span className="text-neutral-200">{d.start_time} – {d.end_time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
        {step < 6 ? (
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
