'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/app/components/ThemeToggle'
import SiteLogo from '@/app/components/SiteLogo'

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
  has_clothing: boolean
}

type EventType = 'singles' | 'doubles' | 'both'

// ── Shared input / label classes ────────────────────────────────────────────

const inputCls =
  'w-full bg-[var(--sl-surface-deep)] border border-[var(--sl-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--sl-text)] focus:outline-none focus:border-[var(--sl-accent-40)] transition'

const labelCls = 'block text-[10px] font-bold tracking-widest text-[var(--sl-text-30)] mb-1'

// ── Section wrapper ─────────────────────────────────────────────────────────

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-6 h-6 rounded-full bg-[var(--sl-accent-10)] border border-[var(--sl-accent-30)] text-[var(--sl-accent)] text-xs font-bold flex items-center justify-center shrink-0">
          {n}
        </span>
        <h2 className="text-sm font-bold tracking-widest text-[var(--sl-text-80)]">{title}</h2>
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

  // Section 4 — Clothing sizes (shown when tournament has_clothing)
  const [tshirtSize, setTshirtSize] = useState('')
  const [sweaterSize, setSweaterSize] = useState('')
  const [trackpantSize, setTrackpantSize] = useState('')

  // Section 5 — Save info
  const [saveInfo, setSaveInfo] = useState(false)
  const [password, setPassword] = useState('')

  // Submission
  const [error, setError] = useState<string | null>(null)

  // ── Fetch tournament details ──────────────────────────────────────────────

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('tournaments')
      .select('id, name, tournament_details(singles_fee, doubles_fee, has_singles_draw, has_doubles_draw, has_clothing)')
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
            has_clothing: d?.has_clothing ?? false,
          })
          setEventType(hasSingles ? 'singles' : 'doubles')
        }
        setLoadingTournament(false)
      })
  }, [id])

  // Pre-fill from profile if logged in
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      if (user.email) setEmail(user.email)

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, usr_rating, division')
        .eq('id', user.id)
        .single()

      if (profile) {
        if (profile.first_name) setFirstName(profile.first_name)
        if (profile.last_name) setLastName(profile.last_name)
        if (profile.phone) setPhone(profile.phone)
        if (profile.usr_rating != null) setRating(String(profile.usr_rating))
        if (profile.division) setSelectedDivision(profile.division)
      } else {
        // Google OAuth users — fall back to auth metadata
        const meta = user.user_metadata ?? {}
        if (meta.given_name) setFirstName(meta.given_name)
        else if (meta.full_name) setFirstName(meta.full_name.split(' ')[0] ?? '')
        if (meta.family_name) setLastName(meta.family_name)
        else if (meta.full_name) setLastName(meta.full_name.split(' ').slice(1).join(' '))
      }
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
    (!saveInfo || password.length >= 6) &&
    (!tournament?.has_clothing || (tshirtSize !== '' && sweaterSize !== '' && trackpantSize !== ''))

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!canSubmit) {
      setError('Please complete all required fields.')
      return
    }
    // TODO: Stripe payment integration
    // After payment confirmed, redirect to apparel store
    window.location.href = 'https://www.sqsh.life/collections/all'
  }

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loadingTournament) {
    return (
      <main className="min-h-screen bg-[var(--sl-bg)] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--sl-accent)] border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[var(--sl-bg)] text-[var(--sl-text)]">
      {/* Header */}
      <header className="border-b border-[var(--sl-border)] px-6 py-4 flex items-center justify-between" style={{ backgroundColor: 'var(--sl-bg)' }}>
        <Link href="/">
          <SiteLogo />
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href={`/tournament/${id}`}
            className="text-xs font-semibold tracking-widest text-[var(--sl-text-30)] hover:text-[var(--sl-text-60)] transition"
          >
            ← BACK
          </Link>
        </div>
      </header>

      <div className="px-6 py-10 max-w-xl mx-auto">
        {/* Page title */}
        <div className="mb-8">
          <p className="text-[var(--sl-text-30)] text-xs tracking-widest uppercase mb-1">Registration</p>
          <h1 className="text-2xl font-bold tracking-wider text-[var(--sl-text)]">{tournament?.name ?? 'Tournament'}</h1>
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
              <label className={labelCls}>PHONE NUMBER <span className="text-[var(--sl-text-20)]">(optional)</span></label>
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
                  <p className="text-[var(--sl-accent)] text-xs mt-2 font-semibold">
                    Auto-assigned division: <span className="font-bold">{ratingToDivision(parseFloat(rating))}</span>
                  </p>
                )}
              </div>
            )}

            <label className="flex items-center gap-3 cursor-pointer select-none mb-4">
              <div
                onClick={() => { setHasNoRating(!hasNoRating); setSelectedDivision(null) }}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                  hasNoRating
                    ? 'bg-[var(--sl-accent)] border-[var(--sl-accent)]'
                    : 'border-[var(--sl-text-20)] bg-transparent'
                }`}
              >
                {hasNoRating && <span className="text-[var(--sl-btn-text)] text-xs font-bold">✓</span>}
              </div>
              <span className="text-sm text-[var(--sl-text-60)]">I don&apos;t have a Club Locker rating</span>
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
                          ? 'bg-[var(--sl-accent-10)] border-[var(--sl-accent)] text-[var(--sl-text)]'
                          : 'bg-[var(--sl-surface-deep)] border-[var(--sl-border)] text-[var(--sl-text-60)] hover:border-[var(--sl-text-20)] hover:text-[var(--sl-text-80)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className={`font-bold text-sm tracking-widest ${selectedDivision === d.label ? 'text-[var(--sl-accent)]' : 'text-[var(--sl-text-80)]'}`}>
                            {d.label}
                          </span>
                          <span className="text-xs text-[var(--sl-text-40)] ml-3">{d.subtitle}</span>
                        </div>
                        <span className="text-xs text-[var(--sl-text-30)] shrink-0 ml-2">USR {d.range}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-[var(--sl-text-20)] text-xs mt-4 leading-relaxed">
                  The Tournament Director reserves the right to reassign divisions based on known playing level.
                </p>
              </div>
            )}

            {!hasNoRating && (
              <p className="text-[var(--sl-text-20)] text-xs leading-relaxed">
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
                    eventType === 'singles'
                      ? 'bg-[var(--sl-accent-10)] border-[var(--sl-accent)]'
                      : 'bg-[var(--sl-surface-deep)] border-[var(--sl-border)] hover:border-[var(--sl-text-20)]'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="event" value="singles" checked={eventType === 'singles'} onChange={() => setEventType('singles')} />
                      <span className="text-sm font-semibold text-[var(--sl-text)]">Singles</span>
                    </div>
                    {tournament.singles_fee != null && (
                      <span className="text-[var(--sl-accent)] font-bold text-sm">${tournament.singles_fee}</span>
                    )}
                  </label>
                )}
                {tournament.has_doubles && (
                  <label className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition ${
                    eventType === 'doubles'
                      ? 'bg-[var(--sl-accent-10)] border-[var(--sl-accent)]'
                      : 'bg-[var(--sl-surface-deep)] border-[var(--sl-border)] hover:border-[var(--sl-text-20)]'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="event" value="doubles" checked={eventType === 'doubles'} onChange={() => setEventType('doubles')} />
                      <span className="text-sm font-semibold text-[var(--sl-text)]">Doubles</span>
                    </div>
                    {tournament.doubles_fee != null && (
                      <span className="text-[var(--sl-accent)] font-bold text-sm">${tournament.doubles_fee}</span>
                    )}
                  </label>
                )}
                {tournament.has_singles && tournament.has_doubles && (
                  <label className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition ${
                    eventType === 'both'
                      ? 'bg-[var(--sl-accent-10)] border-[var(--sl-accent)]'
                      : 'bg-[var(--sl-surface-deep)] border-[var(--sl-border)] hover:border-[var(--sl-text-20)]'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="event" value="both" checked={eventType === 'both'} onChange={() => setEventType('both')} />
                      <span className="text-sm font-semibold text-[var(--sl-text)]">Singles + Doubles</span>
                    </div>
                    {tournament.singles_fee != null && tournament.doubles_fee != null && (
                      <span className="text-[var(--sl-accent)] font-bold text-sm">
                        ${tournament.singles_fee + tournament.doubles_fee}
                      </span>
                    )}
                  </label>
                )}
              </div>
            </Section>
          )}

          {/* ── Section 4: Clothing Sizes (if tournament includes clothing) ── */}
          {tournament?.has_clothing && (
            <Section n={4} title="CLOTHING SIZES">
              <p className="text-[var(--sl-text-30)] text-xs mb-4">
                Your entry includes custom SQSH.LIFE apparel. Select your sizes below.
              </p>
              {(['T-SHIRT', 'SWEATER', 'TRACKPANT'] as const).map((item) => {
                const val = item === 'T-SHIRT' ? tshirtSize : item === 'SWEATER' ? sweaterSize : trackpantSize
                const setter = item === 'T-SHIRT' ? setTshirtSize : item === 'SWEATER' ? setSweaterSize : setTrackpantSize
                return (
                  <div key={item} className="mb-3">
                    <label className={labelCls}>{item} SIZE <span className="text-red-400">*</span></label>
                    <select value={val} onChange={e => setter(e.target.value)} className={inputCls}>
                      <option value="">Select size…</option>
                      {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </Section>
          )}

          {/* ── Section 5: Save for next time ── */}
          <Section n={tournament?.has_clothing ? 5 : 4} title="SAVE FOR NEXT TIME">
            <label className="flex items-start gap-3 cursor-pointer select-none mb-4">
              <div
                onClick={() => setSaveInfo(!saveInfo)}
                className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${
                  saveInfo
                    ? 'bg-[var(--sl-accent)] border-[var(--sl-accent)]'
                    : 'border-[var(--sl-text-20)] bg-transparent'
                }`}
              >
                {saveInfo && <span className="text-[var(--sl-btn-text)] text-xs font-bold">✓</span>}
              </div>
              <div>
                <span className="text-sm text-[var(--sl-text-60)]">Save my info for future tournaments</span>
                <p className="text-[var(--sl-text-30)] text-xs mt-0.5">Creates a SQSH.LIFE account linked to your email</p>
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
              <p className="text-[var(--sl-text-20)] text-xs">Continuing as guest — no account will be created.</p>
            )}
          </Section>

          {/* ── Section 6: Summary + Payment ── */}
          <Section n={tournament?.has_clothing ? 6 : 5} title="SUMMARY">
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--sl-text-40)]">Name</span>
                <span className="text-[var(--sl-text)] font-medium">
                  {firstName || lastName ? `${firstName} ${lastName}`.trim() : <span className="text-[var(--sl-text-20)]">—</span>}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--sl-text-40)]">Division</span>
                <span className={`font-bold tracking-widest text-sm ${assignedDivision ? 'text-[var(--sl-accent)]' : 'text-[var(--sl-text-20)]'}`}>
                  {assignedDivision ?? '—'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--sl-text-40)]">Event</span>
                <span className="text-[var(--sl-text)] capitalize">{eventType.replace('both', 'Singles + Doubles')}</span>
              </div>
              <div className="h-px bg-[var(--sl-border)]" />
              <div className="flex justify-between">
                <span className="text-[var(--sl-text-40)] text-sm">Entry Fee</span>
                <span className="text-[var(--sl-accent)] font-bold text-lg">
                  {entryFee != null ? `$${entryFee}` : <span className="text-[var(--sl-text-20)] text-sm">—</span>}
                </span>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm mb-4">{error}</p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full py-4 rounded-xl bg-[var(--sl-accent)] text-[var(--sl-btn-text)] font-bold tracking-widest text-sm hover:bg-[var(--sl-accent-hover)] transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              PROCEED TO PAYMENT
            </button>

            {!canSubmit && (
              <p className="text-[var(--sl-text-20)] text-xs text-center mt-3">
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
