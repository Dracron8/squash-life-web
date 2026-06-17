'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  buildClubPayload,
  buildTournamentDetailsPayload,
  calcScheduleMaxPlayers,
  loadWizardFormFromDb,
  type DaySchedule,
  type WizardForm,
} from '@/lib/td/flutterParity'

// ─── Constants ────────────────────────────────────────────────────────────────

// Flutter Step 0 surfaces: Hardwood | Synthetic | Glass | Concrete
const SURFACES = ['Hardwood', 'Synthetic', 'Glass', 'Concrete'] as const

// Step labels match Flutter TDSetupFlow step header
const STEPS = ['CLUB', 'DETAILS', 'SCHEDULE', 'DAY', 'SUMMARY'] as const

const LS_KEY      = 'td_wizard_v3'
const LS_STEP_KEY = 'td_wizard_step_v3'

const COURT_DISPLAY_OPTIONS = ['App only', 'App + printed', 'Printed only'] as const

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

function SummaryRow({
  label,
  value,
}: {
  label: string
  value: string | number | boolean | null | undefined
}) {
  if (value === undefined || value === null || value === '') return null
  const display =
    typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)
  return (
    <div className="flex justify-between items-baseline gap-4 py-1.5 border-b border-neutral-800 last:border-0">
      <span className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase flex-shrink-0">
        {label}
      </span>
      <span className="text-sm text-neutral-200 text-right">{display}</span>
    </div>
  )
}

function fmtDate(d: string) {
  if (!d) return '—'
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function toMinsLocal(t: string): number {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NewTournamentPage() {
  const router = useRouter()

  const [form, setForm] = useState<Form>(() => {
    if (typeof window === 'undefined') return INITIAL
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) return { ...INITIAL, ...(JSON.parse(saved) as Partial<Form>) }
    } catch { /* ignore */ }
    return INITIAL
  })

  const [step, setStep] = useState<number>(() => {
    if (typeof window === 'undefined') return 1
    try {
      // 1. Try the persisted step value
      const savedStep = localStorage.getItem(LS_STEP_KEY)
      const n = savedStep ? Number(savedStep) : NaN
      if (Number.isFinite(n) && n >= 1 && n <= 5) return n

      // 2. Infer from form data as fallback
      const saved = localStorage.getItem(LS_KEY)
      if (saved) {
        const f = JSON.parse(saved) as Partial<Form>
        const ds = f.day_schedules as DaySchedule[] | undefined
        if (ds && ds.length > 0) return 4
        if (f.name?.trim()) return 3
        if (f._club_id) return 2
      }
    } catch { /* ignore */ }
    return 1
  })

  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loadingEdit, setLoadingEdit] = useState(false)

  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  // Persist form to localStorage on every change
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(form))
  }, [form])

  // Persist step to localStorage
  useEffect(() => {
    localStorage.setItem(LS_STEP_KEY, String(step))
  }, [step])

  // Pre-fill club fields from saved profile (new tournament only)
  useEffect(() => {
    if (editId) return
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('club_name, club_city, club_province, club_country')
        .eq('id', user.id)
        .maybeSingle()
      if (!profile) return
      // Always apply profile data for club fields — profile is authoritative for pre-fill.
      // Do not use prev.venue_X || guard: stale localStorage values must not block pre-fill.
      if (profile.club_name || profile.club_city || profile.club_province || profile.club_country) {
        setForm(prev => ({
          ...prev,
          venue_name: profile.club_name || '',
          venue_city: profile.club_city || '',
          venue_province: profile.club_province || '',
          venue_country: profile.club_country || 'Canada',
        }))
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId])

  // Load existing tournament for edit mode (from list or detail "EDIT SETUP")
  useEffect(() => {
    const eid = editId
    if (!eid) {
      setIsEdit(false)
      setEditingId(null)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoadingEdit(true)
      setError(null)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        const { data: t, error: tErr } = await supabase
          .from('tournaments')
          .select('id, name, status, draw_type, td_id, tournament_details(*, clubs(*))')
          .eq('id', eid)
          .single()

        if (tErr || !t) throw tErr ?? new Error('Tournament not found.')
        if ((t as any).td_id !== user.id) {
          router.push('/td')
          return
        }

        const tdetsArr = (t as any).tournament_details
        const tdets = Array.isArray(tdetsArr) ? tdetsArr[0] : tdetsArr
        const clb = tdets?.clubs || null

        const loaded = loadWizardFormFromDb(t, tdets, clb)
        // Prefer DB data over any stale LS for this edit session
        setForm({ ...INITIAL, ...loaded } as Form)
        setIsEdit(true)
        setEditingId(eid)
        // Reset step to review on load (user can use stepper to change)
        setStep(5)
        // Clear any prior wizard LS so it doesn't fight the loaded data
        localStorage.removeItem(LS_KEY)
        localStorage.removeItem(LS_STEP_KEY)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load tournament for editing.')
      } finally {
        if (!cancelled) setLoadingEdit(false)
      }
    })()
    return () => { cancelled = true }
  }, [editId, router])

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
    if (step === 2) {
      if (!form.name.trim()) return 'Tournament name is required.'
      if (!form.has_singles_draw && !form.has_doubles_draw)
        return 'Select at least one draw (singles or doubles).'
      if (form.start_date && form.end_date && form.start_date > form.end_date)
        return 'End date must be on or after the start date.'
    }
    if (step === 3) {
      if (form.day_schedules.length === 0)
        return 'Add at least one day schedule.'
      for (let i = 0; i < form.day_schedules.length; i++) {
        const d = form.day_schedules[i]
        if (!d.start_time || !d.end_time)
          return `Day ${i + 1}: both start and end time are required.`
        if (d.start_time >= d.end_time)
          return `Day ${i + 1}: end time must be after start time.`
      }
      if (!form.match_duration_minutes || Number(form.match_duration_minutes) <= 0)
        return 'Match duration must be a positive number.'
      if (!form.rolling_lunch && Number(form.lunch_break_duration_mins) < 0)
        return 'Enter a valid lunch break duration.'
    }
    if (step === 4) {
      if (
        form.check_in_required &&
        (!form.check_in_open_mins || Number(form.check_in_open_mins) < 1)
      )
        return 'Enter how many minutes before the match check-in opens (≥ 1).'
    }
    if (step === 5) {
      if (!form.name.trim())
        return 'Tournament name is missing — go back to Step 2.'
      if (!form.start_date || !form.end_date)
        return 'Start and end dates are required — go back to Step 2.'
      if (form.day_schedules.length === 0)
        return 'No day schedule found — go back to Step 3.'
    }
    return null
  }

  function jumpTo(n: number) {
    setError(null)
    setStep(n)
    window.scrollTo(0, 0)
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
        await supabase
          .from('clubs')
          .update(buildClubPayload(user.id, form))
          .eq('id', existing.id)
        setForm(prev => ({ ...prev, _club_id: existing.id }))
      } else {
        const { data: newClub } = await supabase
          .from('clubs')
          .insert(buildClubPayload(user.id, form))
          .select('id')
          .single()
        if (newClub) setForm(prev => ({ ...prev, _club_id: newClub.id }))
      }

      setStep(2)
      window.scrollTo(0, 0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  // ── Save & Open Registration (Step 5, new tournament only) ──────────────
  async function saveAndOpenRegistration() {
    const err = validate()
    if (err) { setError(err); return }
    setError(null)
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: newTournament, error: tErr } = await supabase
        .from('tournaments')
        .insert({
          td_id: user.id,
          name: form.name.trim(),
          status: 'registration_open',
          draw_type: form.draw_type,
          court_entry_code: '1234',
        })
        .select('id')
        .single()

      if (tErr || !newTournament)
        throw tErr ?? new Error('Failed to create tournament.')

      const { error: dErr } = await supabase
        .from('tournament_details')
        .insert(
          buildTournamentDetailsPayload(newTournament.id, form._club_id ?? null, form),
        )
      if (dErr) throw dErr

      await supabase.from('profiles').upsert({
        id: user.id,
        club_name: form.venue_name.trim(),
        club_city: form.venue_city.trim(),
        club_province: form.venue_province.trim(),
        club_country: form.venue_country.trim(),
      }, { onConflict: 'id' })

      localStorage.removeItem(LS_KEY)
      localStorage.removeItem(LS_STEP_KEY)

      router.push(`/td/tournaments/${newTournament.id}?created=1`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  // ── Cancel / Discard (with confirm) ─────────────────────────────────────
  function discard() {
    const msg = isEdit
      ? 'Discard your changes and return to the tournament detail page? (Unsaved edits will be lost.)'
      : 'Discard and return to My Tournaments? (Unsaved progress will be lost.)'
    if (!confirm(msg)) return
    localStorage.removeItem(LS_KEY)
    localStorage.removeItem(LS_STEP_KEY)
    if (isEdit && editingId) {
      router.push(`/td/tournaments/${editingId}`)
    } else {
      router.push('/td')
    }
  }

  // ── Create or Update (Step 5) — reuses buildTournamentDetailsPayload exactly ─
  async function saveTournament() {
    const err = validate()
    if (err) { setError(err); return }
    setError(null)
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      if (isEdit && editingId) {
        // UPDATE path
        // 1. Update tournament core
        const { error: tErr } = await supabase
          .from('tournaments')
          .update({
            name: form.name.trim(),
            draw_type: form.draw_type,
          })
          .eq('id', editingId)
        if (tErr) throw tErr

        // 2. Update club (if we have one) using same payload helper
        if (form._club_id) {
          await supabase
            .from('clubs')
            .update(buildClubPayload(user.id, form))
            .eq('id', form._club_id)
        }

        // 3. Update tournament_details using the exact same payload builder
        const fullPayload = buildTournamentDetailsPayload(editingId, form._club_id ?? null, form)
        // Strip row-identifying fields that are not updatable via this payload
        const { tournament_id, club_id: _cid, ...detailUpdate } = fullPayload as any
        const { error: dErr } = await supabase
          .from('tournament_details')
          .update(detailUpdate)
          .eq('tournament_id', editingId)
        if (dErr) throw dErr

        // Upsert club profile for future pre-fill
        await supabase.from('profiles').upsert({
          id: user.id,
          club_name: form.venue_name.trim(),
          club_city: form.venue_city.trim(),
          club_province: form.venue_province.trim(),
          club_country: form.venue_country.trim(),
        }, { onConflict: 'id' })

        // Clear wizard state
        localStorage.removeItem(LS_KEY)
        localStorage.removeItem(LS_STEP_KEY)

        router.push(`/td/tournaments/${editingId}?updated=1`)
      } else {
        // CREATE path (original)
        const { data: newTournament, error: tErr } = await supabase
          .from('tournaments')
          .insert({
            td_id: user.id,
            name: form.name.trim(),
            status: 'setup_pending',
            draw_type: form.draw_type,
            court_entry_code: '1234',
          })
          .select('id')
          .single()

        if (tErr || !newTournament)
          throw tErr ?? new Error('Failed to create tournament.')

        // Insert tournament_details using the payload helper
        const { error: dErr } = await supabase
          .from('tournament_details')
          .insert(
            buildTournamentDetailsPayload(newTournament.id, form._club_id ?? null, form),
          )
        if (dErr) throw dErr

        // Upsert club profile for future pre-fill
        await supabase.from('profiles').upsert({
          id: user.id,
          club_name: form.venue_name.trim(),
          club_city: form.venue_city.trim(),
          club_province: form.venue_province.trim(),
          club_country: form.venue_country.trim(),
        }, { onConflict: 'id' })

        // Clear wizard state
        localStorage.removeItem(LS_KEY)
        localStorage.removeItem(LS_STEP_KEY)

        router.push(`/td/tournaments/${newTournament.id}?created=1`)
      }
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
        href={isEdit && editingId ? `/td/tournaments/${editingId}` : '/td'}
        className="text-xs text-neutral-500 hover:text-neutral-300 transition"
      >
        ← {isEdit && editingId ? 'TOURNAMENT DETAIL' : 'MY TOURNAMENTS'}
      </Link>
      <h1 className="text-2xl font-bold tracking-wide mt-3 mb-8">
        {isEdit ? 'EDIT TOURNAMENT SETUP' : 'TOURNAMENT SETUP'}
      </h1>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-10 overflow-x-auto pb-2">
        {STEPS.map((label, i) => {
          const n = i + 1
          const done   = n < step
          const active = n === step
          return (
            <div key={n} className="flex items-center gap-1 flex-shrink-0">
              <div
                onClick={done ? () => jumpTo(n) : undefined}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold tracking-widest transition
                  ${done
                    ? 'bg-red-900/40 text-red-400 cursor-pointer hover:bg-red-900/70'
                    : active
                    ? 'bg-red-700 text-white'
                    : 'text-neutral-600'}`}
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

      {/* Edit load state */}
      {loadingEdit && (
        <div className="mb-6 flex items-center gap-3 text-sm text-neutral-400">
          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          Loading tournament data for editing…
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

      {/* ── STEP 2: TOURNAMENT DETAILS ─────────────────────────────────────
          Mirrors Flutter tournament details / format, fees, registration, rules, prizes, comms.
          All fields declared in WizardForm + buildTournamentDetailsPayload.     */}
      {step === 2 && (
        <div className="space-y-5">
          {/* Name & Format */}
          <div className={sectionCls}>
            <h2 className={sectionHeadCls}>Tournament Name & Format</h2>
            <div>
              <label className={labelCls}>Tournament Name *</label>
              <input
                className={inputCls}
                placeholder="e.g. Caledon Spring Open 2026"
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Draw Format</label>
              <select
                className={inputCls}
                value={form.draw_type}
                onChange={e => set('draw_type', e.target.value)}
              >
                <option>Knockout + Plate</option>
                <option>Knockout</option>
                <option>Round Robin</option>
                <option>Swiss System</option>
                <option>Round Robin + Knockout</option>
              </select>
              <p className="text-[10px] text-neutral-500 mt-1">Matches the Flutter TD flow options.</p>
            </div>
          </div>

          {/* Dates */}
          <div className={sectionCls}>
            <h2 className={sectionHeadCls}>Dates</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Start Date</label>
                <input
                  type="date"
                  className={inputCls}
                  value={form.start_date}
                  onChange={e => set('start_date', e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>End Date</label>
                <input
                  type="date"
                  className={inputCls}
                  value={form.end_date}
                  onChange={e => set('end_date', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Draws & Entry Fees */}
          <div className={sectionCls}>
            <h2 className={sectionHeadCls}>Draws & Entry Fees</h2>

            <div className="flex flex-col gap-3">
              <Toggle
                value={form.has_singles_draw}
                onChange={v => set('has_singles_draw', v)}
                label="Singles Draw"
              />
              {form.has_singles_draw && (
                <div className="pl-2">
                  <label className={labelCls}>Singles Entry Fee ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputCls}
                    placeholder="0"
                    value={form.singles_entry_fee}
                    onChange={e => set('singles_entry_fee', e.target.value)}
                  />
                </div>
              )}

              <Toggle
                value={form.has_doubles_draw}
                onChange={v => set('has_doubles_draw', v)}
                label="Doubles Draw"
              />
              {form.has_doubles_draw && (
                <div className="pl-2 space-y-3">
                  <div>
                    <label className={labelCls}>Doubles Entry Fee ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={inputCls}
                      placeholder="0"
                      value={form.doubles_entry_fee}
                      onChange={e => set('doubles_entry_fee', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Both (Singles + Doubles) Fee ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={inputCls}
                      placeholder="0"
                      value={form.both_entry_fee}
                      onChange={e => set('both_entry_fee', e.target.value)}
                    />
                    <p className="text-[10px] text-neutral-500 mt-1">Optional combined rate when a player enters both.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Registration Window */}
          <div className={sectionCls}>
            <h2 className={sectionHeadCls}>Registration</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Registration Opens</label>
                <input
                  type="date"
                  className={inputCls}
                  value={form.registration_opens}
                  onChange={e => set('registration_opens', e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Registration Deadline</label>
                <input
                  type="date"
                  className={inputCls}
                  value={form.registration_deadline}
                  onChange={e => set('registration_deadline', e.target.value)}
                />
              </div>
            </div>

            <Toggle
              value={form.has_waitlist}
              onChange={v => set('has_waitlist', v)}
              label="Offer Waitlist"
            />
            {form.has_waitlist && (
              <div className="pl-2">
                <label className={labelCls}>Waitlist Spots</label>
                <input
                  type="number"
                  min="1"
                  className={inputCls}
                  value={form.waitlist_spots}
                  onChange={e => set('waitlist_spots', e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Rules & Limits */}
          <div className={sectionCls}>
            <h2 className={sectionHeadCls}>Rules & Limits</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Min Rest Between Matches (hours)</label>
                <input
                  type="number"
                  min="0"
                  className={inputCls}
                  value={form.min_rest_hours}
                  onChange={e => set('min_rest_hours', e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Max Matches Per Player Per Day</label>
                <input
                  type="number"
                  min="1"
                  className={inputCls}
                  value={form.max_matches_per_day}
                  onChange={e => set('max_matches_per_day', e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Warm-up Time (minutes)</label>
                <input
                  type="number"
                  min="0"
                  className={inputCls}
                  value={form.warm_up_minutes}
                  onChange={e => set('warm_up_minutes', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Forfeit Time (minutes after scheduled start)</label>
              <input
                type="number"
                min="0"
                className={inputCls}
                value={form.forfeit_minutes}
                onChange={e => set('forfeit_minutes', e.target.value)}
              />
            </div>

            <Toggle
              value={form.multi_division_allow_multiple}
              onChange={v => set('multi_division_allow_multiple', v)}
              label="Allow Players to Enter Multiple Divisions"
            />
          </div>

          {/* Prizes, Officials & Gifts */}
          <div className={sectionCls}>
            <h2 className={sectionHeadCls}>Prizes, Officials & Gifts</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Prize Purse ($)</label>
                <input
                  type="number"
                  min="0"
                  className={inputCls}
                  value={form.prize_purse}
                  onChange={e => set('prize_purse', e.target.value)}
                />
              </div>
              <div className="pt-6">
                <Toggle
                  value={form.has_trophy}
                  onChange={v => set('has_trophy', v)}
                  label="Trophy / Awards"
                />
              </div>
            </div>

            <Toggle
              value={form.has_referee}
              onChange={v => set('has_referee', v)}
              label="Referee Required / Provided"
            />

            <Toggle
              value={form.has_player_gift}
              onChange={v => set('has_player_gift', v)}
              label="Player Gift / Goodie Bag"
            />
            {form.has_player_gift && (
              <div className="pl-2">
                <label className={labelCls}>Gift Description</label>
                <input
                  className={inputCls}
                  placeholder="e.g. Custom towel + water bottle"
                  value={form.player_gift_desc}
                  onChange={e => set('player_gift_desc', e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Sponsor, Social, Notes */}
          <div className={sectionCls}>
            <h2 className={sectionHeadCls}>Sponsor, Social & Notes</h2>

            <div>
              <label className={labelCls}>Sponsor Name</label>
              <input
                className={inputCls}
                placeholder="e.g. Local Racquet Shop"
                value={form.sponsor_name}
                onChange={e => set('sponsor_name', e.target.value)}
              />
            </div>

            <Toggle
              value={form.has_social_event}
              onChange={v => set('has_social_event', v)}
              label="Social Event / After-Party"
            />
            {form.has_social_event && (
              <div className="pl-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Social Event Time</label>
                  <input
                    type="time"
                    className={inputCls}
                    value={form.social_event_time}
                    onChange={e => set('social_event_time', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Social Event Description</label>
                  <input
                    className={inputCls}
                    placeholder="BBQ + awards at the club"
                    value={form.social_event_desc}
                    onChange={e => set('social_event_desc', e.target.value)}
                  />
                </div>
              </div>
            )}

            <div>
              <label className={labelCls}>Tournament Notes (visible to players)</label>
              <textarea
                className={`${inputCls} min-h-[90px] resize-y`}
                placeholder="Any special rules, parking info, or requests..."
                value={form.tournament_notes}
                onChange={e => set('tournament_notes', e.target.value)}
              />
            </div>
          </div>

          {/* Communications & Welcome */}
          <div className={sectionCls}>
            <h2 className={sectionHeadCls}>Communications & Welcome</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>TD Contact Email</label>
                <input
                  type="email"
                  className={inputCls}
                  placeholder="td@club.com"
                  value={form.td_email}
                  onChange={e => set('td_email', e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>TD Phone (for comms)</label>
                <input
                  type="tel"
                  className={inputCls}
                  placeholder="905-555-0199"
                  value={form.td_phone_comm}
                  onChange={e => set('td_phone_comm', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <Toggle
                value={form.auto_notify_draw}
                onChange={v => set('auto_notify_draw', v)}
                label="Auto-notify players when draw is published"
              />
              <Toggle
                value={form.auto_reminder_match}
                onChange={v => set('auto_reminder_match', v)}
                label="Send match reminder (hours before)"
              />
            </div>

            {form.auto_reminder_match && (
              <div className="pl-2">
                <label className={labelCls}>Reminder Hours Before Match</label>
                <input
                  type="number"
                  min="1"
                  className={inputCls}
                  value={form.reminder_hours}
                  onChange={e => set('reminder_hours', e.target.value)}
                />
              </div>
            )}

            <div>
              <label className={labelCls}>Welcome Message (shown on registration)</label>
              <textarea
                className={`${inputCls} min-h-[80px] resize-y`}
                placeholder="Welcome to the tournament! Courts open at 8am..."
                value={form.welcome_message}
                onChange={e => set('welcome_message', e.target.value)}
              />
            </div>
          </div>

          {/* Capacity preview (uses same logic as final payload) */}
          <div className="px-1 text-[10px] text-neutral-500">
            Estimated max players (using current schedule defaults):{' '}
            <span className="font-mono text-neutral-400">{calcScheduleMaxPlayers(form) || '—'}</span>
          </div>
        </div>
      )}

      {/* ── STEP 3: SCHEDULE ─────────────────────────────────────────────────
          Mirrors Flutter schedule step / day_schedules editor.                 */}
      {step === 3 && (
        <div className="space-y-5">

          {/* Daily Schedule Blocks */}
          <div className={sectionCls}>
            <h2 className={sectionHeadCls}>Daily Schedule Blocks</h2>
            <p className="text-xs text-neutral-500 -mt-2">
              Define the start and end time for each day of the tournament.
            </p>

            {form.day_schedules.length === 0 && (
              <p className="text-sm text-neutral-500 italic">
                No days added yet — use the buttons below.
              </p>
            )}

            <div className="space-y-3">
              {form.day_schedules.map((day, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                  <div>
                    {i === 0 && <label className={labelCls}>Label</label>}
                    <input
                      className={inputCls}
                      placeholder={`Day ${i + 1}`}
                      value={day.label}
                      onChange={e => {
                        const next = [...form.day_schedules]
                        next[i] = { ...next[i], label: e.target.value }
                        set('day_schedules', next)
                      }}
                    />
                  </div>
                  <div>
                    {i === 0 && <label className={labelCls}>Start Time</label>}
                    <input
                      type="time"
                      className={inputCls}
                      value={day.start_time}
                      onChange={e => {
                        const next = [...form.day_schedules]
                        next[i] = { ...next[i], start_time: e.target.value }
                        set('day_schedules', next)
                      }}
                    />
                  </div>
                  <div>
                    {i === 0 && <label className={labelCls}>End Time</label>}
                    <input
                      type="time"
                      className={inputCls}
                      value={day.end_time}
                      onChange={e => {
                        const next = [...form.day_schedules]
                        next[i] = { ...next[i], end_time: e.target.value }
                        set('day_schedules', next)
                      }}
                    />
                  </div>
                  <div className={i === 0 ? 'pt-6' : ''}>
                    <button
                      type="button"
                      onClick={() =>
                        set('day_schedules', form.day_schedules.filter((_, j) => j !== i))
                      }
                      className="text-neutral-500 hover:text-red-400 transition text-lg leading-none px-2 py-3"
                      aria-label="Remove day"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1 flex-wrap">
              <button
                type="button"
                onClick={() =>
                  set('day_schedules', [
                    ...form.day_schedules,
                    { label: '', start_time: '', end_time: '' },
                  ])
                }
                className="text-xs font-bold tracking-widest text-red-400 border border-red-800 hover:border-red-600 px-4 py-2 rounded-lg transition"
              >
                + ADD DAY
              </button>
              {form.start_date && form.end_date && (
                <button
                  type="button"
                  onClick={() => {
                    const start = new Date(form.start_date + 'T00:00:00')
                    const end   = new Date(form.end_date   + 'T00:00:00')
                    const days: DaySchedule[] = []
                    for (
                      const d = new Date(start);
                      d <= end;
                      d.setDate(d.getDate() + 1)
                    ) {
                      days.push({ label: `Day ${days.length + 1}`, start_time: '', end_time: '' })
                    }
                    set('day_schedules', days)
                  }}
                  className="text-xs font-bold tracking-widest text-neutral-400 border border-neutral-700 hover:border-neutral-500 px-4 py-2 rounded-lg transition"
                >
                  GENERATE FROM DATES
                </button>
              )}
            </div>
          </div>

          {/* Match & Break Settings */}
          <div className={sectionCls}>
            <h2 className={sectionHeadCls}>Match & Break Settings</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Match Duration (minutes) *</label>
                <input
                  type="number"
                  min="10"
                  className={inputCls}
                  value={form.match_duration_minutes}
                  onChange={e => set('match_duration_minutes', e.target.value)}
                />
              </div>
            </div>

            <Toggle
              value={form.rolling_lunch}
              onChange={v => set('rolling_lunch', v)}
              label="Rolling Lunch (no fixed break)"
            />
            {!form.rolling_lunch && (
              <div>
                <label className={labelCls}>Lunch Break Duration (minutes)</label>
                <input
                  type="number"
                  min="0"
                  className={inputCls}
                  value={form.lunch_break_duration_mins}
                  onChange={e => set('lunch_break_duration_mins', e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Live capacity + per-day preview */}
          <div className="px-1 text-[10px] text-neutral-500 space-y-1">
            <div>
              Estimated max players:{' '}
              <span className="font-mono text-neutral-400">
                {calcScheduleMaxPlayers(form) || '—'}
              </span>
            </div>
            <div>
              Capacity is calculated from the day blocks + match duration + number of courts from Step 1.
            </div>
            {form.day_schedules.length > 0 && Number(form.num_courts) > 0 && (
              <div className="pt-1 text-neutral-400">
                Per-day estimate (courts × blocks):{' '}
                <span className="font-mono text-neutral-300">
                  {(() => {
                    const courts = Number(form.num_courts) || 0
                    const matchMins = Number(form.match_duration_minutes) || 40
                    const lunch = form.rolling_lunch ? 0 : (Number(form.lunch_break_duration_mins) || 0)
                    return form.day_schedules.map((d, i) => {
                      const dur = (d.start_time && d.end_time) ? (toMinsLocal(d.end_time) - toMinsLocal(d.start_time) - lunch) : 0
                      const slots = dur > 0 ? Math.floor(dur / matchMins) * courts : 0
                      return `${d.label || 'Day ' + (i+1)}: ~${slots}`
                    }).join('  ·  ')
                  })()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 4: DAY-OF LOGISTICS ─────────────────────────────────────────
          Mirrors Flutter step4_logistics_settings.dart                         */}
      {step === 4 && (
        <div className="space-y-5">

          {/* Check-in */}
          <div className={sectionCls}>
            <h2 className={sectionHeadCls}>Check-in</h2>
            <Toggle
              value={form.check_in_required}
              onChange={v => set('check_in_required', v)}
              label="Check-in Required"
            />
            {form.check_in_required && (
              <div className="pl-2">
                <label className={labelCls}>Check-in Opens (minutes before first match)</label>
                <input
                  type="number"
                  min="1"
                  className={inputCls}
                  value={form.check_in_open_mins}
                  onChange={e => set('check_in_open_mins', e.target.value)}
                />
                <p className="text-[10px] text-neutral-500 mt-1">
                  e.g. 60 = check-in opens 1 hour before the player&apos;s first match.
                </p>
              </div>
            )}
          </div>

          {/* Scoring & Display */}
          <div className={sectionCls}>
            <h2 className={sectionHeadCls}>Scoring & Display</h2>
            <div className="space-y-4">
              <Toggle
                value={form.live_scoring}
                onChange={v => set('live_scoring', v)}
                label="Live Scoring (players enter scores in-app)"
              />
              <Toggle
                value={form.score_verification}
                onChange={v => set('score_verification', v)}
                label="Score Verification (opponent must confirm)"
              />
              <Toggle
                value={form.print_score_sheets}
                onChange={v => set('print_score_sheets', v)}
                label="Print Score Sheets"
              />
            </div>

            <div>
              <label className={labelCls}>Court Assignment Display</label>
              <div className="flex gap-2 flex-wrap mt-1">
                {COURT_DISPLAY_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => set('court_assignment_display', opt)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold tracking-widest transition border
                      ${form.court_assignment_display === opt
                        ? 'bg-red-700 border-red-600 text-white'
                        : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-neutral-500 mt-2">
                Controls how court assignments are shown to players on the day.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 5: SUMMARY ──────────────────────────────────────────────────
          Review all entered data before creating / updating.                   */}
      {step === 5 && (
        <div className="space-y-5">
          <p className="text-sm text-neutral-400">
            Review your tournament setup below. You can go back to edit any section.
            {isEdit
              ? ' When ready, hit '
              : ' When everything looks good, hit '}
            <strong className="text-white">{isEdit ? 'UPDATE TOURNAMENT' : 'Create Tournament'}</strong>.
          </p>

          {/* Club */}
          <div className={sectionCls}>
            <div className="flex items-center justify-between mb-1">
              <h2 className={sectionHeadCls}>Club</h2>
              <button
                type="button"
                onClick={() => jumpTo(1)}
                className="text-[10px] font-bold tracking-widest text-neutral-500 hover:text-red-400 transition"
              >
                EDIT
              </button>
            </div>
            <SummaryRow label="Name" value={form.venue_name} />
            <SummaryRow
              label="Location"
              value={[form.venue_city, form.venue_province, form.venue_country]
                .filter(Boolean)
                .join(', ')}
            />
            <SummaryRow label="Courts" value={`${form.num_courts} × ${form.surface_type}`} />
            {form.has_doubles_courts && (
              <SummaryRow label="Doubles Courts" value={form.num_doubles_courts} />
            )}
          </div>

          {/* Tournament */}
          <div className={sectionCls}>
            <div className="flex items-center justify-between mb-1">
              <h2 className={sectionHeadCls}>Tournament</h2>
              <button
                type="button"
                onClick={() => jumpTo(2)}
                className="text-[10px] font-bold tracking-widest text-neutral-500 hover:text-red-400 transition"
              >
                EDIT
              </button>
            </div>
            <SummaryRow label="Name" value={form.name} />
            <SummaryRow label="Format" value={form.draw_type} />
            <SummaryRow
              label="Dates"
              value={
                form.start_date && form.end_date
                  ? form.start_date === form.end_date
                    ? fmtDate(form.start_date)
                    : `${fmtDate(form.start_date)} – ${fmtDate(form.end_date)}`
                  : undefined
              }
            />
            {form.has_singles_draw && (
              <SummaryRow
                label="Singles Fee"
                value={form.singles_entry_fee ? `$${form.singles_entry_fee}` : 'Free'}
              />
            )}
            {form.has_doubles_draw && (
              <SummaryRow
                label="Doubles Fee"
                value={form.doubles_entry_fee ? `$${form.doubles_entry_fee}` : 'Free'}
              />
            )}
            {Number(form.prize_purse) > 0 && (
              <SummaryRow label="Prize Purse" value={`$${form.prize_purse}`} />
            )}
            {form.registration_deadline && (
              <SummaryRow label="Reg. Deadline" value={fmtDate(form.registration_deadline)} />
            )}
            <SummaryRow label="Min Rest" value={form.min_rest_hours ? `${form.min_rest_hours} hrs` : undefined} />
            <SummaryRow label="Max / Player / Day" value={form.max_matches_per_day} />
            <SummaryRow label="Warm-up" value={form.warm_up_minutes ? `${form.warm_up_minutes} min` : undefined} />
            <SummaryRow label="Forfeit after" value={form.forfeit_minutes ? `${form.forfeit_minutes} min` : undefined} />
            {form.has_waitlist && (
              <SummaryRow label="Waitlist" value={`${form.waitlist_spots || 0} spots`} />
            )}
          </div>

          {/* Schedule */}
          <div className={sectionCls}>
            <div className="flex items-center justify-between mb-1">
              <h2 className={sectionHeadCls}>Schedule</h2>
              <button
                type="button"
                onClick={() => jumpTo(3)}
                className="text-[10px] font-bold tracking-widest text-neutral-500 hover:text-red-400 transition"
              >
                EDIT
              </button>
            </div>
            <SummaryRow label="Match Duration" value={`${form.match_duration_minutes} min`} />
            <SummaryRow
              label="Lunch"
              value={
                form.rolling_lunch
                  ? 'Rolling (no fixed break)'
                  : `Fixed — ${form.lunch_break_duration_mins} min break`
              }
            />
            {form.day_schedules.length > 0 && (
              <div className="pt-2">
                <span className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
                  Defined Schedule Blocks
                </span>
                <div className="mt-2 overflow-hidden border border-neutral-800 rounded-xl">
                  <div className="grid grid-cols-3 bg-neutral-950 text-[10px] font-bold tracking-widest text-neutral-500 px-3 py-1.5">
                    <div>DAY</div>
                    <div>START</div>
                    <div>END</div>
                  </div>
                  {form.day_schedules.map((d, i) => (
                    <div key={i} className="grid grid-cols-3 px-3 py-1.5 text-sm text-neutral-300 border-t border-neutral-800 last:border-b-0">
                      <div className="text-neutral-400">{d.label || `Day ${i + 1}`}</div>
                      <div className="font-mono text-neutral-200">{d.start_time || '—'}</div>
                      <div className="font-mono text-neutral-200">{d.end_time || '—'}</div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-neutral-600 mt-1">These blocks (from Step 3) drive daily windows, capacity calc, and are collapsed to flat fields on save.</p>
              </div>
            )}
            <SummaryRow
              label="Est. Capacity"
              value={calcScheduleMaxPlayers(form) ? `${calcScheduleMaxPlayers(form)} players` : undefined}
            />
            {form.day_schedules.length > 0 && Number(form.num_courts) > 0 && (
              <div className="pt-1 text-[10px] text-neutral-500">
                Daily slots preview:{' '}
                <span className="font-mono text-neutral-300">
                  {(() => {
                    const courts = Number(form.num_courts) || 0
                    const matchMins = Number(form.match_duration_minutes) || 40
                    const lunch = form.rolling_lunch ? 0 : (Number(form.lunch_break_duration_mins) || 0)
                    return form.day_schedules.map((d, i) => {
                      const dur = (d.start_time && d.end_time) ? (toMinsLocal(d.end_time) - toMinsLocal(d.start_time) - lunch) : 0
                      const slots = dur > 0 ? Math.floor(dur / matchMins) * courts : 0
                      return `${d.label || 'D' + (i+1)}:~${slots}`
                    }).join(' ')
                  })()}
                </span>
              </div>
            )}
          </div>

          {/* Day-of */}
          <div className={sectionCls}>
            <div className="flex items-center justify-between mb-1">
              <h2 className={sectionHeadCls}>Day-of Logistics</h2>
              <button
                type="button"
                onClick={() => jumpTo(4)}
                className="text-[10px] font-bold tracking-widest text-neutral-500 hover:text-red-400 transition"
              >
                EDIT
              </button>
            </div>
            <SummaryRow
              label="Check-in"
              value={
                form.check_in_required
                  ? `Required — opens ${form.check_in_open_mins} min before`
                  : 'Not required'
              }
            />
            <SummaryRow label="Live Scoring" value={form.live_scoring} />
            <SummaryRow label="Score Verification" value={form.score_verification} />
            <SummaryRow label="Print Score Sheets" value={form.print_score_sheets} />
            <SummaryRow label="Court Assignment" value={form.court_assignment_display} />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-8 pb-10">
        <button
          type="button"
          onClick={discard}
          className="px-5 text-sm font-bold tracking-widest text-neutral-500 hover:text-red-400 transition"
        >
          CANCEL
        </button>

        {step > 1 && (
          <button
            type="button"
            onClick={back}
            className="flex-1 border border-neutral-700 text-neutral-400 text-sm font-bold tracking-widest py-3.5 rounded-xl hover:border-neutral-500 transition"
          >
            BACK
          </button>
        )}

        {step === 1 ? (
          <button
            type="button"
            onClick={saveClubAndContinue}
            disabled={saving || loadingEdit}
            className="flex-1 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold tracking-widest py-3.5 rounded-xl transition"
          >
            {saving ? 'SAVING...' : 'SAVE CLUB & CONTINUE'}
          </button>
        ) : step === 5 ? (
          isEdit ? (
            <button
              type="button"
              onClick={saveTournament}
              disabled={saving || loadingEdit}
              className="flex-1 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold tracking-widest py-3.5 rounded-xl transition"
            >
              {saving ? 'UPDATING...' : 'UPDATE TOURNAMENT'}
            </button>
          ) : (
            <div className="flex-1 flex flex-col gap-3">
              <button
                type="button"
                onClick={saveAndOpenRegistration}
                disabled={saving || loadingEdit}
                className="w-full bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold tracking-widest py-3.5 rounded-xl transition"
              >
                {saving ? 'CREATING...' : 'CREATE & OPEN REGISTRATION'}
              </button>
              <button
                type="button"
                onClick={saveTournament}
                disabled={saving || loadingEdit}
                className="w-full disabled:opacity-50 text-sm font-bold tracking-widest py-3.5 rounded-xl transition"
                style={{ border: '1.5px solid rgba(192,57,43,0.5)', color: '#C0392B', background: 'transparent' }}
              >
                {saving ? 'CREATING...' : 'SAVE AS DRAFT'}
              </button>
            </div>
          )
        ) : (
          <button
            type="button"
            onClick={next}
            disabled={loadingEdit}
            className="flex-1 bg-red-700 hover:bg-red-600 text-white text-sm font-bold tracking-widest py-3.5 rounded-xl transition"
          >
            NEXT
          </button>
        )}
      </div>
    </div>
  )
}
