'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// ── Division helpers ────────────────────────────────────────────────────────

function ratingToDivision(rating: number): string {
  if (rating >= 5.5) return 'OPEN'
  if (rating >= 4.5) return 'A'
  if (rating >= 3.5) return 'B'
  if (rating >= 2.5) return 'C'
  return 'D'
}

const DIVISION_CARDS = [
  { label: 'OPEN', subtitle: 'Tournament player, provincial/national level', range: '5.5+' },
  { label: 'A',    subtitle: 'Strong competitive club player',               range: '4.5 – 5.49' },
  { label: 'B',    subtitle: 'Intermediate competitive player',              range: '3.5 – 4.49' },
  { label: 'C',    subtitle: 'Recreational competitive player',              range: '2.5 – 3.49' },
  { label: 'D',    subtitle: 'Beginner / new to tournaments',                range: '< 2.5' },
]

// ── Types ───────────────────────────────────────────────────────────────────

type TournamentInfo = {
  id: string
  name: string
  singles_fee: number | null
  doubles_fee: number | null
  has_singles: boolean
  has_doubles: boolean
}

type EventType = 'singles' | 'doubles' | 'both'

// ── Shared input classes ────────────────────────────────────────────────────

const inputCls =
  'w-full bg-[#111] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#d4af37]/50 transition'

const labelCls = 'block text-[10px] font-bold tracking-widest text-white/30 mb-1'

// ── Section wrapper ─────────────────────────────────────────────────────────

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-6 h-6 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] text-xs font-bold flex items-center justify-center shrink-0">
          {n}
        </span>
        <h2 className="text-sm font-bold tracking-widest text-white/80">{title}</h2>
      </div>
      {children}
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function RegisterPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  // Tournament data
  const [tournament, setTournament] = useState<TournamentInfo | null>(null)
  const [loadingTournament, setLoadingTournament] = useState(true)

  // Section 1 — Personal info
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  // Section 2 — Rating / division
  const [hasNoRating, setHasNoRating] = useState(false)
  const [rating, setRating] = useState('')
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null)

  // Section 3 — Event type
  const [eventType, setEventType] = useState<EventType>('singles')

  // Section 4 — Save info
  const [saveInfo, setSaveInfo] = useState(false)
  const [password, setPassword] = useState('')

  // Submission
  const [error, setError] = useState<string | null>(null)

  // ── Fetch tournament details ──────────────────────────────────────────────

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('tournaments')
      .select('id, name, tournament_details(singles_fee, doubles_fee, has_singles_draw, has_doubles_draw)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const d = (data as any).tournament_details?.[0]
          const hasSingles = d?.has_singles_draw ?? true
          const hasDoubles = d?.has_doubles_draw ?? false
          setTournament({
            id: data.id,
            name: data.name,
            singles_fee: d?.singles_fee ?? null,
            doubles_fee: d?.doubles_fee ?? null,
            has_singles: hasSingles,
            has_doubles: hasDoubles,
          })
          setEventType(hasSingles ? 'singles' : 'doubles')
        }
        setLoadingTournament(false)
      })
  }, [id])

  // Pre-fill email if logged in
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email)
    })
  }, [])

  // ── Derived values ────────────────────────────────────────────────────────

  const assignedDivision: string | null = hasNoRating
    ? selectedDivision
    : rating ? ratingToDivision(parseFloat(rating)) : null

  const entryFee: number | null = (() => {
    if (!tournament) return null
    if (eventType === 'singles') return tournament.singles_fee
    if (eventType === 'doubles') return tournament.doubles_fee
    return (tournament.singles_fee ?? 0) + (tournament.doubles_fee ?? 0)
  })()

  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    assignedDivision !== null &&
    (!saveInfo || password.length >= 6)

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!canSubmit) {
      setError('Please complete all required fields.')
      return
    }
    alert('Payment coming soon — your registration will be confirmed after Stripe integration is complete.')
  }

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loadingTournament) {
    return (
      <main className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold tracking-widest text-[#d4af37]" style={{ fontFamily: 'Georgia, serif' }}>
          SQUASH LIFE
        </Link>
        <Link
          href={`/tournament/${id}`}
          className="text-xs font-semibold tracking-widest text-white/30 hover:text-white/60 transition"
        >
          ← BACK
        </Link>
      </header>

      <div className="px-6 py-10 max-w-xl mx-auto">
        {/* Page title */}
        <div className="mb-8">
          <p className="text-white/30 text-xs tracking-widest uppercase mb-1">Registration</p>
          <h1 className="text-2xl font-bold tracking-wider">{tournament?.name ?? 'Tournament'}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Section 1: Personal Info ── */}
          <Section n={1} title="PERSONAL INFO">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelCls}>FIRST NAME <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>LAST NAME <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  required
                  className={inputCls}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className={labelCls}>EMAIL <span className="text-red-400">*</span></label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                required
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>PHONE NUMBER <span className="text-white/20">(optional)</span></label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (416) 555-0100"
                className={inputCls}
              />
            </div>
          </Section>

          {/* ── Section 2: Rating / Division ── */}
          <Section n={2} title="CLUB LOCKER RATING">
            {!hasNoRating && (
              <div className="mb-4">
                <label className={labelCls}>WHAT IS YOUR CURRENT CLUB LOCKER RATING? <span className="text-red-400">*</span></label>
                <input
                  type="number"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  placeholder="e.g. 4.5"
                  step="0.01"
                  min="0"
                  max="7"
                  className={inputCls}
                />
                {rating && !isNaN(parseFloat(rating)) && (
                  <p className="text-[#d4af37] text-xs mt-2 font-semibold">
                    Auto-assigned division: <span className="font-bold">{ratingToDivision(parseFloat(rating))}</span>
                  </p>
                )}
              </div>
            )}

            <label className="flex items-center gap-3 cursor-pointer select-none mb-4">
              <div
                onClick={() => { setHasNoRating(!hasNoRating); setSelectedDivision(null) }}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                  hasNoRating ? 'bg-[#d4af37] border-[#d4af37]' : 'border-white/20 bg-transparent'
                }`}
              >
                {hasNoRating && <span className="text-black text-xs font-bold">✓</span>}
              </div>
              <span className="text-sm text-white/60">I don&apos;t have a Club Locker rating</span>
            </label>

            {hasNoRating && (
              <div>
                <p className={labelCls + ' mb-3'}>SELECT YOUR DIVISION <span className="text-red-400">*</span></p>
                <div className="space-y-2">
                  {DIVISION_CARDS.map((d) => (
                    <button
                      key={d.label}
                      type="button"
                      onClick={() => setSelectedDivision(d.label)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                        selectedDivision === d.label
                          ? 'bg-[#d4af37]/10 border-[#d4af37] text-white'
                          : 'bg-[#111] border-white/10 text-white/60 hover:border-white/20 hover:text-white/80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className={`font-bold text-sm tracking-widest ${selectedDivision === d.label ? 'text-[#d4af37]' : 'text-white/80'}`}>
                            {d.label}
                          </span>
                          <span className="text-xs text-white/40 ml-3">{d.subtitle}</span>
                        </div>
                        <span className="text-xs text-white/30 shrink-0 ml-2">USR {d.range}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-white/20 text-xs mt-4 leading-relaxed">
                  The Tournament Director reserves the right to reassign divisions based on known playing level.
                </p>
              </div>
            )}

            {!hasNoRating && (
              <p className="text-white/20 text-xs leading-relaxed">
                The Tournament Director reserves the right to reassign divisions based on known playing level.
              </p>
            )}
          </Section>

          {/* ── Section 3: Event Selection ── */}
          {tournament && (tournament.has_singles || tournament.has_doubles) && (
            <Section n={3} title="EVENT SELECTION">
              <div className="space-y-2">
                {tournament.has_singles && (
                  <label className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition ${
                    eventType === 'singles' ? 'bg-[#d4af37]/10 border-[#d4af37]' : 'bg-[#111] border-white/10 hover:border-white/20'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="event" value="singles" checked={eventType === 'singles'} onChange={() => setEventType('singles')} className="accent-[#d4af37]" />
                      <span className="text-sm font-semibold">Singles</span>
                    </div>
                    {tournament.singles_fee != null && (
                      <span className="text-[#d4af37] font-bold text-sm">${tournament.singles_fee}</span>
                    )}
                  </label>
                )}
                {tournament.has_doubles && (
                  <label className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition ${
                    eventType === 'doubles' ? 'bg-[#d4af37]/10 border-[#d4af37]' : 'bg-[#111] border-white/10 hover:border-white/20'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="event" value="doubles" checked={eventType === 'doubles'} onChange={() => setEventType('doubles')} className="accent-[#d4af37]" />
                      <span className="text-sm font-semibold">Doubles</span>
                    </div>
                    {tournament.doubles_fee != null && (
                      <span className="text-[#d4af37] font-bold text-sm">${tournament.doubles_fee}</span>
                    )}
                  </label>
                )}
                {tournament.has_singles && tournament.has_doubles && (
                  <label className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition ${
                    eventType === 'both' ? 'bg-[#d4af37]/10 border-[#d4af37]' : 'bg-[#111] border-white/10 hover:border-white/20'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="event" value="both" checked={eventType === 'both'} onChange={() => setEventType('both')} className="accent-[#d4af37]" />
                      <span className="text-sm font-semibold">Singles + Doubles</span>
                    </div>
                    {tournament.singles_fee != null && tournament.doubles_fee != null && (
                      <span className="text-[#d4af37] font-bold text-sm">
                        ${tournament.singles_fee + tournament.doubles_fee}
                      </span>
                    )}
                  </label>
                )}
              </div>
            </Section>
          )}

          {/* ── Section 4: Save for next time ── */}
          <Section n={4} title="SAVE FOR NEXT TIME">
            <label className="flex items-start gap-3 cursor-pointer select-none mb-4">
              <div
                onClick={() => setSaveInfo(!saveInfo)}
                className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${
                  saveInfo ? 'bg-[#d4af37] border-[#d4af37]' : 'border-white/20 bg-transparent'
                }`}
              >
                {saveInfo && <span className="text-black text-xs font-bold">✓</span>}
              </div>
              <div>
                <span className="text-sm text-white/70">Save my info for future tournaments</span>
                <p className="text-white/30 text-xs mt-0.5">Creates a Squash Life account linked to your email</p>
              </div>
            </label>

            {saveInfo && (
              <div>
                <label className={labelCls}>CREATE PASSWORD <span className="text-red-400">*</span></label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className={inputCls}
                />
                {saveInfo && password.length > 0 && password.length < 6 && (
                  <p className="text-red-400 text-xs mt-1">Password must be at least 6 characters</p>
                )}
              </div>
            )}

            {!saveInfo && (
              <p className="text-white/20 text-xs">Continuing as guest — no account will be created.</p>
            )}
          </Section>

          {/* ── Section 5: Summary + Payment ── */}
          <Section n={5} title="SUMMARY">
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Name</span>
                <span className="text-white font-medium">
                  {firstName || lastName ? `${firstName} ${lastName}`.trim() : <span className="text-white/20">—</span>}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Division</span>
                <span className={`font-bold tracking-widest text-sm ${assignedDivision ? 'text-[#d4af37]' : 'text-white/20'}`}>
                  {assignedDivision ?? '—'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Event</span>
                <span className="text-white capitalize">{eventType.replace('both', 'Singles + Doubles')}</span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex justify-between">
                <span className="text-white/40 text-sm">Entry Fee</span>
                <span className="text-[#d4af37] font-bold text-lg">
                  {entryFee != null ? `$${entryFee}` : <span className="text-white/20 text-sm">—</span>}
                </span>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm mb-4">{error}</p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full py-4 rounded-xl bg-[#d4af37] text-black font-bold tracking-widest text-sm hover:bg-[#c9a84c] transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              PROCEED TO PAYMENT
            </button>

            {!canSubmit && (
              <p className="text-white/20 text-xs text-center mt-3">
                {!assignedDivision
                  ? 'Enter your rating or select a division to continue'
                  : 'Complete all required fields to continue'}
              </p>
            )}
          </Section>

        </form>
      </div>
    </main>
  )
}
