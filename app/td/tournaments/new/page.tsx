'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import SiteLogo from '@/app/components/SiteLogo'
import ThemeToggle from '@/app/components/ThemeToggle'

const DRAW_TYPES = [
  'Knockout + Plate',
  'Round Robin → Knockout',
  'Full Round Robin',
  'Monrad',
]

const DEFAULT_DIVISIONS = ['A Grade', 'B Grade', 'C Grade', 'D Grade']

type FormState = {
  // Step 1
  name: string
  draw_type: string
  venue_name: string
  venue_address: string
  venue_city: string
  // Step 2
  start_date: string
  end_date: string
  singles_fee: string
  registration_deadline: string
  max_players: string
  // Step 3
  courts_available: string
  match_duration_minutes: string
  daily_start_time: string
  daily_end_time: string
  min_rest_minutes: string
  // Step 4
  has_singles_draw: boolean
  has_doubles_draw: boolean
  divisions: string[]
}

const STEP_TITLES = [
  'BASICS',
  'REGISTRATION',
  'SCHEDULE',
  'DIVISIONS',
]

export default function NewTournamentPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [divisionInput, setDivisionInput] = useState('')

  const [form, setForm] = useState<FormState>({
    name: '',
    draw_type: 'Knockout + Plate',
    venue_name: '',
    venue_address: '',
    venue_city: '',
    start_date: '',
    end_date: '',
    singles_fee: '',
    registration_deadline: '',
    max_players: '',
    courts_available: '4',
    match_duration_minutes: '40',
    daily_start_time: '08:00',
    daily_end_time: '20:00',
    min_rest_minutes: '90',
    has_singles_draw: true,
    has_doubles_draw: false,
    divisions: ['A Grade', 'B Grade', 'C Grade'],
  })

  function set(field: keyof FormState, value: string | boolean | string[]) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function addDivision(div: string) {
    const trimmed = div.trim()
    if (!trimmed || form.divisions.includes(trimmed)) return
    set('divisions', [...form.divisions, trimmed])
    setDivisionInput('')
  }

  function removeDivision(div: string) {
    set('divisions', form.divisions.filter(d => d !== div))
  }

  function validateStep(): string | null {
    if (step === 1) {
      if (!form.name.trim()) return 'Tournament name is required.'
    }
    if (step === 2) {
      if (!form.start_date) return 'Start date is required.'
      if (!form.end_date) return 'End date is required.'
      if (form.end_date < form.start_date) return 'End date must be on or after start date.'
    }
    if (step === 4) {
      if (!form.has_singles_draw && !form.has_doubles_draw) return 'Select at least one draw type.'
      if (form.divisions.length === 0) return 'Add at least one division.'
    }
    return null
  }

  function nextStep() {
    const err = validateStep()
    if (err) { setError(err); return }
    setError(null)
    setStep(s => s + 1)
  }

  function prevStep() {
    setError(null)
    setStep(s => s - 1)
  }

  async function handleSubmit() {
    const err = validateStep()
    if (err) { setError(err); return }
    setError(null)
    setSaving(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // 1. Create tournament
      const { data: tournament, error: tErr } = await supabase
        .from('tournaments')
        .insert({
          name: form.name.trim(),
          td_id: user.id,
          status: 'setup_pending',
          draw_type: form.draw_type,
        })
        .select('id')
        .single()

      if (tErr || !tournament) throw new Error(tErr?.message ?? 'Failed to create tournament')

      // 2. Create club if venue provided
      let club_id: string | null = null
      if (form.venue_name.trim()) {
        const { data: club } = await supabase
          .from('clubs')
          .insert({
            td_id: user.id,
            name: form.venue_name.trim(),
            address: form.venue_address.trim(),
            city: form.venue_city.trim(),
          })
          .select('id')
          .single()
        club_id = club?.id ?? null
      }

      // 3. Create tournament_details
      const { error: dErr } = await supabase
        .from('tournament_details')
        .insert({
          tournament_id: tournament.id,
          club_id,
          start_date: form.start_date,
          end_date: form.end_date,
          daily_start_time: form.daily_start_time,
          daily_end_time: form.daily_end_time,
          courts_available: Number(form.courts_available) || 4,
          match_duration_minutes: Number(form.match_duration_minutes) || 40,
          min_rest_minutes: Number(form.min_rest_minutes) || 90,
          singles_fee: form.singles_fee ? Number(form.singles_fee) : 0,
          registration_deadline: form.registration_deadline || null,
          max_players: form.max_players ? Number(form.max_players) : null,
          format: form.draw_type,
          has_singles_draw: form.has_singles_draw,
          has_doubles_draw: form.has_doubles_draw,
        })

      if (dErr) throw new Error(dErr.message)

      router.push(`/td/tournaments/${tournament.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSaving(false)
    }
  }

  const inputClass = `w-full bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-xl px-4 py-3 text-sm text-[var(--sl-text)] placeholder-[var(--sl-text-30)] focus:outline-none focus:border-[var(--sl-accent)] transition`
  const labelClass = 'block text-[10px] font-bold tracking-widest text-[var(--sl-text-40)] uppercase mb-2'

  return (
    <main className="min-h-screen bg-[var(--sl-bg)] text-[var(--sl-text)]">
      <header className="border-b border-[var(--sl-border)] px-6 py-4 flex items-center justify-between">
        <Link href="/td"><SiteLogo /></Link>
        <ThemeToggle />
      </header>

      <section className="px-6 py-10 max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/td" className="text-xs text-[var(--sl-text-30)] hover:text-[var(--sl-accent)] transition">← MY TOURNAMENTS</Link>
          <h1 className="text-3xl font-bold tracking-wider mt-3">CREATE TOURNAMENT</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-10">
          {STEP_TITLES.map((title, i) => {
            const n = i + 1
            const active = n === step
            const done = n < step
            return (
              <div key={n} className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition ${
                    done
                      ? 'bg-[var(--sl-accent)] text-[var(--sl-btn-text)]'
                      : active
                        ? 'border-2 border-[var(--sl-accent)] text-[var(--sl-accent)]'
                        : 'border border-[var(--sl-border)] text-[var(--sl-text-30)]'
                  }`}>
                    {done ? '✓' : n}
                  </div>
                  <span className={`text-[10px] font-bold tracking-widest hidden sm:block ${active ? 'text-[var(--sl-text)]' : 'text-[var(--sl-text-30)]'}`}>
                    {title}
                  </span>
                </div>
                {i < STEP_TITLES.length - 1 && (
                  <div className={`h-px w-6 sm:w-10 ${n < step ? 'bg-[var(--sl-accent)]' : 'bg-[var(--sl-border)]'}`} />
                )}
              </div>
            )
          })}
        </div>

        {error && (
          <div className="mb-6 text-sm text-red-400 border border-red-500/20 bg-red-500/5 rounded-xl px-4 py-3">
            {error}
            <button onClick={() => setError(null)} className="ml-3 text-red-300 hover:text-red-200">✕</button>
          </div>
        )}

        {/* ── Step 1: Basics ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-2xl p-6 space-y-5">
              <h2 className={labelClass}>Tournament Details</h2>

              <div>
                <label className={labelClass}>Tournament Name *</label>
                <input
                  className={inputClass}
                  placeholder="e.g. ONE BEACHIN' 2026"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass}>Format / Draw Type</label>
                <select
                  className={inputClass}
                  value={form.draw_type}
                  onChange={e => set('draw_type', e.target.value)}
                >
                  {DRAW_TYPES.map(dt => <option key={dt} value={dt}>{dt}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-2xl p-6 space-y-5">
              <h2 className={labelClass}>Venue / Club</h2>

              <div>
                <label className={labelClass}>Club / Venue Name</label>
                <input
                  className={inputClass}
                  placeholder="e.g. Beachside Squash Club"
                  value={form.venue_name}
                  onChange={e => set('venue_name', e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass}>Address</label>
                <input
                  className={inputClass}
                  placeholder="123 Main St"
                  value={form.venue_address}
                  onChange={e => set('venue_address', e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass}>City</label>
                <input
                  className={inputClass}
                  placeholder="Sydney"
                  value={form.venue_city}
                  onChange={e => set('venue_city', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Registration ───────────────────────────────────────── */}
        {step === 2 && (
          <div className="bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-2xl p-6 space-y-5">
            <h2 className={labelClass}>Registration & Dates</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Start Date *</label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.start_date}
                  onChange={e => set('start_date', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>End Date *</label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.end_date}
                  onChange={e => set('end_date', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Registration Deadline</label>
              <input
                type="date"
                className={inputClass}
                value={form.registration_deadline}
                onChange={e => set('registration_deadline', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Entry Fee (CAD $)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  placeholder="0.00"
                  value={form.singles_fee}
                  onChange={e => set('singles_fee', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Max Players</label>
                <input
                  type="number"
                  min="2"
                  className={inputClass}
                  placeholder="e.g. 64"
                  value={form.max_players}
                  onChange={e => set('max_players', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Schedule ───────────────────────────────────────────── */}
        {step === 3 && (
          <div className="bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-2xl p-6 space-y-5">
            <h2 className={labelClass}>Courts & Schedule</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Courts Available</label>
                <input
                  type="number"
                  min="1"
                  className={inputClass}
                  value={form.courts_available}
                  onChange={e => set('courts_available', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Match Duration (mins)</label>
                <input
                  type="number"
                  min="10"
                  step="5"
                  className={inputClass}
                  value={form.match_duration_minutes}
                  onChange={e => set('match_duration_minutes', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Daily Start Time</label>
                <input
                  type="time"
                  className={inputClass}
                  value={form.daily_start_time}
                  onChange={e => set('daily_start_time', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Daily End Time</label>
                <input
                  type="time"
                  className={inputClass}
                  value={form.daily_end_time}
                  onChange={e => set('daily_end_time', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Minimum Rest Between Matches (mins)</label>
              <input
                type="number"
                min="0"
                step="15"
                className={inputClass}
                value={form.min_rest_minutes}
                onChange={e => set('min_rest_minutes', e.target.value)}
              />
              <p className="text-[var(--sl-text-30)] text-xs mt-2">Minimum rest time a player must have between their matches.</p>
            </div>
          </div>
        )}

        {/* ── Step 4: Divisions ──────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-2xl p-6 space-y-5">
              <h2 className={labelClass}>Draw Type</h2>
              <div className="flex flex-col gap-3">
                {[
                  { key: 'has_singles_draw', label: 'Singles Draw' },
                  { key: 'has_doubles_draw', label: 'Doubles Draw' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => set(key as keyof FormState, !form[key as keyof FormState])}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                        form[key as keyof FormState]
                          ? 'bg-[var(--sl-accent)] border-[var(--sl-accent)]'
                          : 'border-[var(--sl-border)]'
                      }`}
                    >
                      {form[key as keyof FormState] && <span className="text-[var(--sl-btn-text)] text-[10px] font-bold">✓</span>}
                    </div>
                    <span className="text-sm text-[var(--sl-text-60)]">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-2xl p-6 space-y-4">
              <h2 className={labelClass}>Divisions Offered</h2>

              {/* Quick-add preset buttons */}
              <div className="flex flex-wrap gap-2">
                {DEFAULT_DIVISIONS.filter(d => !form.divisions.includes(d)).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => addDivision(d)}
                    className="text-[10px] font-bold tracking-widest px-3 py-1.5 rounded-lg border border-dashed border-[var(--sl-border)] text-[var(--sl-text-40)] hover:border-[var(--sl-accent)] hover:text-[var(--sl-accent)] transition"
                  >
                    + {d}
                  </button>
                ))}
              </div>

              {/* Added divisions */}
              {form.divisions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.divisions.map(d => (
                    <span
                      key={d}
                      className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest px-3 py-1.5 rounded-lg bg-[var(--sl-accent-10)] text-[var(--sl-accent)] border border-[var(--sl-accent-20)]"
                    >
                      {d}
                      <button
                        type="button"
                        onClick={() => removeDivision(d)}
                        className="text-[var(--sl-accent)] hover:text-red-400 transition ml-0.5"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Custom division input */}
              <div className="flex gap-2">
                <input
                  className={`${inputClass} flex-1`}
                  placeholder="Custom division (e.g. Open)"
                  value={divisionInput}
                  onChange={e => setDivisionInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDivision(divisionInput) } }}
                />
                <button
                  type="button"
                  onClick={() => addDivision(divisionInput)}
                  className="text-xs font-bold tracking-widest text-[var(--sl-accent)] border border-[var(--sl-accent-40)] px-4 py-3 rounded-xl hover:bg-[var(--sl-accent-10)] transition"
                >
                  ADD
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="flex-1 text-sm font-bold tracking-widest text-[var(--sl-text-40)] border border-[var(--sl-border)] py-3.5 rounded-xl hover:border-[var(--sl-text-20)] transition"
            >
              BACK
            </button>
          )}
          {step < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex-1 text-sm font-bold tracking-widest text-[var(--sl-btn-text)] bg-[var(--sl-accent)] py-3.5 rounded-xl hover:bg-[var(--sl-accent-hover)] transition"
            >
              NEXT
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 text-sm font-bold tracking-widest text-[var(--sl-btn-text)] bg-[var(--sl-accent)] py-3.5 rounded-xl hover:bg-[var(--sl-accent-hover)] disabled:opacity-50 transition"
            >
              {saving ? 'CREATING...' : 'CREATE TOURNAMENT'}
            </button>
          )}
        </div>
      </section>
    </main>
  )
}
