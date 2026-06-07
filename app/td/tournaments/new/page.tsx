'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  buildClubPayload,
  type WizardForm,
} from '@/lib/td/flutterParity'

// ─── Constants ────────────────────────────────────────────────────────────────

// Flutter Step 0 surfaces: Hardwood | Synthetic | Glass | Concrete
const SURFACES = ['Hardwood', 'Synthetic', 'Glass', 'Concrete'] as const

// Step labels match Flutter TDSetupFlow step header
const STEPS = ['CLUB', 'DETAILS', 'SCHEDULE', 'DAY', 'SUMMARY'] as const

const LS_KEY = 'td_wizard_v3'

// ─── Initial Form State ───────────────────────────────────────────────────────

type Form = WizardForm

const INITIAL: Form = {
  // Step 1 — Club Profile (defaults from Flutter _fillTestStep1 / field declarations)
  venue_name: '',
  venue_address: '',
  venue_city: '',
  venue_province: '',
  venue_country: 'Canada',
  venue_phone: '',
  venue_website: '',
  num_courts: '4',
  num_locations: '1',
  surface_type: 'Hardwood',
  has_doubles_courts: false,
  num_doubles_courts: '1',
  glass_back_walls: false,
  wifi: true,
  locker_rooms: false,
  parking: false,

  // Step 2 — Tournament Details
  name: '',
  draw_type: 'Knockout + Plate',
  start_date: '',
  end_date: '',
  has_singles_draw: true,
  has_doubles_draw: false,
  singles_entry_fee: '',
  doubles_entry_fee: '',
  both_entry_fee: '',
  min_rest_hours: '3',
  max_matches_per_day: '2',
  warm_up_minutes: '10',
  registration_opens: '',
  registration_deadline: '',
  has_referee: false,
  has_trophy: false,
  prize_purse: '0',
  has_waitlist: false,
  waitlist_spots: '10',
  forfeit_minutes: '15',
  multi_division_allow_multiple: false,
  has_player_gift: false,
  player_gift_desc: '',
  sponsor_name: '',
  has_social_event: false,
  social_event_time: '',
  social_event_desc: '',
  tournament_notes: '',
  td_email: '',
  td_phone_comm: '',
  auto_notify_draw: true,
  auto_reminder_match: true,
  reminder_hours: '2',
  welcome_message: '',

  // Step 3 — Schedule
  day_schedules: [],
  rolling_lunch: true,
  lunch_break_duration_mins: '60',
  match_duration_minutes: '40',

  // Step 4 — Day-of
  check_in_required: true,
  check_in_open_mins: '60',
  live_scoring: true,
  score_verification: true,
  print_score_sheets: false,
  court_assignment_display: 'App only',

  // Legacy DB-compat
  has_fixed_lunch: false,
  lunch_start: '12:00',
  lunch_duration_mins: '60',
  afternoon_start: '13:00',
  has_dinner_break: false,
  dinner_start: '18:00',
  dinner_duration_mins: '60',
  has_evening_session: false,
  evening_start: '19:00',
  daily_end: '22:00',
  morning_start: '08:00',
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

const inputCls =
  'w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600 transition'
const labelCls =
  'block text-[10px] font-bold tracking-widest text-neutral-500 uppercase mb-2'
const sectionCls =
  'bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5'
const sectionHeadCls =
  'text-[11px] font-bold tracking-widest text-red-500 uppercase'

function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center gap-3 text-sm text-neutral-200 w-full"
    >
      <div
        className={`w-11 h-6 rounded-full transition relative flex-shrink-0 ${value ? 'bg-red-700' : 'bg-neutral-700'}`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${value ? 'left-6' : 'left-1'}`}
        />
      </div>
      <span>{label}</span>
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NewTournamentPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<Form>(() => {
    if (typeof window === 'undefined') return INITIAL
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) return { ...INITIAL, ...(JSON.parse(saved) as Partial<Form>) }
    } catch { /* ignore */ }
    return INITIAL
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(form))
  }, [form])

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  function validate(): string | null {
    if (step === 1) {
      if (!form.venue_name.trim()) return 'Club name is required.'
      if (!form.num_courts || Number(form.num_courts) < 1)
        return 'Enter a valid number of courts (≥ 1).'
    }
    return null
  }

  function next() {
    const err = validate()
    if (err) { setError(err); return }
    setError(null)
    setStep(s => Math.min(s + 1, STEPS.length))
    window.scrollTo(0, 0)
  }

  function back() {
    setError(null)
    setStep(s => Math.max(s - 1, 1))
    window.scrollTo(0, 0)
  }

  // ── Club save (Step 1 only — mirrors Flutter _saveClubAndContinue) ──────────
  async function saveClubAndContinue() {
    const err = validate()
    if (err) { setError(err); return }
    setError(null)
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: existing } = await supabase
        .from('clubs')
        .select('id')
        .ilike('name', form.venue_name.trim())
        .eq('td_id', user.id)
        .maybeSingle()

      if (existing) {
        // Update existing club
        await supabase
          .from('clubs')
          .update(buildClubPayload(user.id, form))
          .eq('id', existing.id)
        setForm(prev => ({ ...prev, _club_id: existing.id } as Form))
      } else {
        // Insert new club
        const { data: newClub } = await supabase
          .from('clubs')
          .insert(buildClubPayload(user.id, form))
          .select('id')
          .single()
        if (newClub) setForm(prev => ({ ...prev, _club_id: newClub.id } as Form))
      }

      setStep(2)
      window.scrollTo(0, 0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Back link */}
      <Link
        href="/td"
        className="text-xs text-neutral-500 hover:text-neutral-300 transition"
      >
        ← MY TOURNAMENTS
      </Link>
      <h1 className="text-2xl font-bold tracking-wide mt-3 mb-8">
        TOURNAMENT SETUP
      </h1>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-10 overflow-x-auto pb-2">
        {STEPS.map((label, i) => {
          const n = i + 1
          const done = n < step
          const active = n === step
          return (
            <div key={n} className="flex items-center gap-1 flex-shrink-0">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold tracking-widest transition
                  ${done ? 'bg-red-900/40 text-red-400' : active ? 'bg-red-700 text-white' : 'text-neutral-600'}`}
              >
                <span>{done ? '✓' : n}</span>
                <span className="hidden sm:block">{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-3 h-px ${n < step ? 'bg-red-700' : 'bg-neutral-800'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 bg-red-900/20 border border-red-700/40 text-red-400 text-sm rounded-xl px-4 py-3 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-3 text-red-600 hover:text-red-400 flex-shrink-0">✕</button>
        </div>
      )}

      {/* ── STEP 1: CLUB PROFILE ─────────────────────────────────────────────
          Mirrors Flutter step1_club_profile.dart / _saveClubAndContinue     */}
      {step === 1 && (
        <div className="space-y-5">
          <div className={sectionCls}>
            <h2 className={sectionHeadCls}>Club Profile</h2>
            <p className="text-xs text-neutral-500 -mt-2">
              Saved permanently — reused for future tournaments.
            </p>

            {/* Club Name */}
            <div>
              <label className={labelCls}>Club Name *</label>
              <input
                className={inputCls}
                placeholder="e.g. Caledon Racquet Club"
                value={form.venue_name}
                onChange={e => set('venue_name', e.target.value)}
              />
            </div>

            {/* Street Address */}
            <div>
              <label className={labelCls}>Street Address</label>
              <input
                className={inputCls}
                placeholder="e.g. 123 Airport Rd"
                value={form.venue_address}
                onChange={e => set('venue_address', e.target.value)}
              />
            </div>

            {/* City (2/3) + Province/State (1/3) */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>City</label>
                <input
                  className={inputCls}
                  placeholder="e.g. Toronto"
                  value={form.venue_city}
                  onChange={e => set('venue_city', e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Province / State</label>
                <input
                  className={inputCls}
                  placeholder="ON"
                  value={form.venue_province}
                  onChange={e => set('venue_province', e.target.value)}
                />
              </div>
            </div>

            {/* Country */}
            <div>
              <label className={labelCls}>Country</label>
              <input
                className={inputCls}
                placeholder="Canada"
                value={form.venue_country}
                onChange={e => set('venue_country', e.target.value)}
              />
            </div>

            {/* Phone Number + Locations */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Phone Number</label>
                <input
                  type="tel"
                  className={inputCls}
                  placeholder="905-555-1234"
                  value={form.venue_phone}
                  onChange={e => set('venue_phone', e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Locations</label>
                <p className="text-[10px] text-neutral-600 mb-2">Multi-site clubs</p>
                <input
                  type="number"
                  min="1"
                  className={inputCls}
                  value={form.num_locations}
                  onChange={e => set('num_locations', e.target.value)}
                />
              </div>
            </div>

            {/* Website URL */}
            <div>
              <label className={labelCls}>Website URL</label>
              <input
                type="url"
                className={inputCls}
                placeholder="https://"
                value={form.venue_website}
                onChange={e => set('venue_website', e.target.value)}
              />
            </div>
          </div>

          {/* Courts */}
          <div className={sectionCls}>
            <h2 className={sectionHeadCls}>Courts</h2>

            {/* Number of Courts + Court Surface */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Number of Courts *</label>
                <input
                  type="number"
                  min="1"
                  className={inputCls}
                  value={form.num_courts}
                  onChange={e => set('num_courts', e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Court Surface</label>
                <select
                  className={inputCls}
                  value={form.surface_type}
                  onChange={e => set('surface_type', e.target.value)}
                >
                  {SURFACES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Doubles Courts Available */}
            <Toggle
              value={form.has_doubles_courts}
              onChange={v => set('has_doubles_courts', v)}
              label="Doubles Courts Available"
            />
            {form.has_doubles_courts && (
              <div>
                <label className={labelCls}>Number of Doubles Courts</label>
                <input
                  type="number"
                  min="1"
                  className={inputCls}
                  value={form.num_doubles_courts}
                  onChange={e => set('num_doubles_courts', e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Amenities */}
          <div className={sectionCls}>
            <h2 className={sectionHeadCls}>Amenities</h2>
            <div className="space-y-4">
              <Toggle
                value={form.glass_back_walls}
                onChange={v => set('glass_back_walls', v)}
                label="Glass Back Walls"
              />
              <Toggle
                value={form.wifi}
                onChange={v => set('wifi', v)}
                label="WiFi Available"
              />
              <Toggle
                value={form.locker_rooms}
                onChange={v => set('locker_rooms', v)}
                label="Locker Rooms"
              />
              <Toggle
                value={form.parking}
                onChange={v => set('parking', v)}
                label="Parking Available"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── STEPS 2–5: Stubs (future chunks) ─────────────────────────────── */}
      {step > 1 && step <= 5 && (
        <div className={sectionCls}>
          <h2 className={sectionHeadCls}>{STEPS[step - 1]}</h2>
          <p className="text-sm text-neutral-400">
            This step is coming in the next chunk.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-8 pb-10">
        {step > 1 && (
          <button
            type="button"
            onClick={back}
            className="flex-1 border border-neutral-700 text-neutral-400 text-sm font-bold tracking-widest py-3.5 rounded-xl hover:border-neutral-500 transition"
          >
            BACK
          </button>
        )}

        {/* Step 1 has its own save action */}
        {step === 1 ? (
          <button
            type="button"
            onClick={saveClubAndContinue}
            disabled={saving}
            className="flex-1 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold tracking-widest py-3.5 rounded-xl transition"
          >
            {saving ? 'SAVING...' : 'SAVE CLUB & CONTINUE'}
          </button>
        ) : (
          <button
            type="button"
            onClick={next}
            className="flex-1 bg-red-700 hover:bg-red-600 text-white text-sm font-bold tracking-widest py-3.5 rounded-xl transition"
          >
            NEXT
          </button>
        )}
      </div>
    </div>
  )
}
