'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/app/components/ThemeToggle'
import SiteLogo from '@/app/components/SiteLogo'

// ── Constants ────────────────────────────────────────────────────────────────

const RATING_MIN = 1.5
const RATING_MAX = 7.0
const RATING_STEP = 0.1

// ── Helpers ──────────────────────────────────────────────────────────────────

function ratingToDivision(r: number): string {
  if (r >= 5.5) return 'OPEN'
  if (r >= 4.5) return 'A'
  if (r >= 3.5) return 'B'
  if (r >= 2.5) return 'C'
  return 'D'
}

function roundToTenth(n: number): number {
  return Math.round(n * 10) / 10
}

function adjustRating(current: number, delta: number): number {
  const next = roundToTenth(current + delta)
  if (next > RATING_MAX) return RATING_MAX
  if (next < RATING_MIN) return RATING_MIN
  return next
}

// ── Types ────────────────────────────────────────────────────────────────────

type PlayerProfile = {
  first_name: string
  last_name:  string
  email:      string
  phone:      string
  club_name:  string
  usr_rating: number | null
}

type TournamentInfo = {
  id:          string
  name:        string
  singles_fee: number | null
  doubles_fee: number | null
  has_singles: boolean
  has_doubles: boolean
}

type EventType = 'singles' | 'doubles' | 'both'

type PageState = 'loading' | 'incomplete' | 'confirm' | 'submitting' | 'success'

function isProfileComplete(p: PlayerProfile): boolean {
  return !!(p.first_name.trim() && p.last_name.trim() && p.usr_rating != null)
}

// ── Main component ───────────────────────────────────────────────────────────

export default function RegisterPage() {
  const params  = useParams()
  const id      = params.id as string
  const router  = useRouter()

  const [state,      setState]      = useState<PageState>('loading')
  const [tournament, setTournament] = useState<TournamentInfo | null>(null)
  const [player,     setPlayer]     = useState<PlayerProfile | null>(null)
  const [userId,     setUserId]     = useState<string | null>(null)

  // Rating editor — initialised from player profile on load
  const [rating,         setRating]         = useState<number>(3.0)
  const [originalRating, setOriginalRating] = useState<number>(3.0)

  // Event selection
  const [eventType, setEventType] = useState<EventType>('singles')
  const [error,     setError]     = useState<string | null>(null)

  // ── Load ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace(`/login?next=/tournament/${id}/register`)
        return
      }
      setUserId(user.id)

      // Tournament info
      const { data: tData } = await supabase
        .from('tournaments')
        .select('id, name, tournament_details(singles_fee, doubles_fee, has_singles_draw, has_doubles_draw)')
        .eq('id', id)
        .single()

      if (tData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d       = (tData as any).tournament_details?.[0]
        const hasSingles = d?.has_singles_draw ?? true
        const hasDoubles = d?.has_doubles_draw ?? false
        setTournament({
          id:          tData.id,
          name:        tData.name,
          singles_fee: d?.singles_fee ?? null,
          doubles_fee: d?.doubles_fee ?? null,
          has_singles: hasSingles,
          has_doubles: hasDoubles,
        })
        setEventType(hasSingles ? 'singles' : 'doubles')
      }

      // Player profile
      const { data: p } = await supabase
        .from('players')
        .select('first_name, last_name, email, phone, club_name, usr_rating')
        .eq('user_id', user.id)
        .maybeSingle()

      const profile: PlayerProfile = {
        first_name: p?.first_name ?? '',
        last_name:  p?.last_name  ?? '',
        email:      p?.email      ?? user.email ?? '',
        phone:      p?.phone      ?? '',
        club_name:  p?.club_name  ?? '',
        usr_rating: p?.usr_rating ?? null,
      }
      setPlayer(profile)

      if (!isProfileComplete(profile)) {
        setState('incomplete')
      } else {
        const r = roundToTenth(Number(profile.usr_rating))
        setRating(r)
        setOriginalRating(r)
        setState('confirm')
      }
    }

    load()
  }, [id, router])

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!player || !userId || !tournament) return
    setError(null)
    setState('submitting')

    const supabase = createClient()

    // If player changed their rating, persist it first
    if (rating !== originalRating) {
      const { error: updateErr } = await supabase
        .from('players')
        .update({ usr_rating: rating })
        .eq('user_id', userId)

      if (updateErr) {
        setError(updateErr.message)
        setState('confirm')
        return
      }
    }

    const division = ratingToDivision(rating)

    const { error: insertErr } = await supabase
      .from('registrations')
      .insert({
        tournament_id:  tournament.id,
        user_id:        userId,
        first_name:     player.first_name,
        last_name:      player.last_name,
        usr_rating:     rating,
        division,
        draw_segment:   'main',
        payment_status: 'pending',
      })

    if (insertErr) {
      setError(insertErr.message)
      setState('confirm')
      return
    }

    setState('success')
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const division = ratingToDivision(rating)

  const entryFee = tournament
    ? eventType === 'singles' ? tournament.singles_fee
    : eventType === 'doubles' ? tournament.doubles_fee
    : (tournament.singles_fee ?? 0) + (tournament.doubles_fee ?? 0)
    : null

  const ratingChanged = rating !== originalRating

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[var(--sl-bg)] text-[var(--sl-text)]">
      <header className="border-b border-[var(--sl-border)] px-6 py-4 flex items-center justify-between" style={{ backgroundColor: 'var(--sl-bg)' }}>
        <Link href="/"><SiteLogo /></Link>
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
        <div className="mb-8">
          <p className="text-[var(--sl-text-30)] text-xs tracking-widest uppercase mb-1">Registration</p>
          <h1 className="text-2xl font-bold tracking-wider">{tournament?.name ?? '...'}</h1>
        </div>

        {/* ── Loading ── */}
        {state === 'loading' && (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-[var(--sl-accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ── Incomplete profile ── */}
        {state === 'incomplete' && (
          <div className="bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-2xl p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--sl-accent-10)] border border-[var(--sl-accent-30)] flex items-center justify-center mx-auto mb-4">
              <span className="text-[var(--sl-accent)] text-xl font-bold">!</span>
            </div>
            <h2 className="text-base font-bold tracking-widest mb-2">COMPLETE YOUR PROFILE FIRST</h2>
            <p className="text-[var(--sl-text-40)] text-sm mb-6 leading-relaxed">
              Please complete your profile before registering.<br />
              We need your name and Club Locker rating to place you in the right division.
            </p>
            <Link
              href={`/profile?next=/tournament/${id}/register`}
              className="inline-block text-sm font-bold tracking-widest text-[var(--sl-btn-text)] bg-[var(--sl-accent)] px-6 py-3 rounded-xl hover:bg-[var(--sl-accent-hover)] transition"
            >
              COMPLETE PROFILE
            </Link>
          </div>
        )}

        {/* ── Confirm ── */}
        {(state === 'confirm' || state === 'submitting') && player && (
          <div className="space-y-4">

            {/* Profile summary — read only */}
            <div className="bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-2xl p-6">
              <p className="text-[10px] font-bold tracking-widest text-[var(--sl-text-30)] mb-4">YOUR REGISTRATION DETAILS</p>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--sl-text-40)]">Name</span>
                  <span className="font-semibold">{player.first_name} {player.last_name}</span>
                </div>
                {player.club_name && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--sl-text-40)]">Club</span>
                    <span className="font-medium">{player.club_name}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--sl-border)]">
                <Link
                  href={`/profile?next=/tournament/${id}/register`}
                  className="text-xs text-[var(--sl-text-30)] hover:text-[var(--sl-accent)] transition"
                >
                  Not right? Update your profile →
                </Link>
              </div>
            </div>

            {/* Inline rating editor */}
            <div className="bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-2xl p-6">
              <p className="text-[10px] font-bold tracking-widest text-[var(--sl-text-30)] mb-5">CONFIRM YOUR RATING</p>

              <div className="flex items-center justify-between gap-4">
                {/* Down arrow */}
                <button
                  type="button"
                  onClick={() => setRating(r => adjustRating(r, -RATING_STEP))}
                  disabled={rating <= RATING_MIN}
                  className="w-12 h-12 rounded-xl border border-[var(--sl-border)] text-[var(--sl-text-60)] text-xl font-bold hover:border-[var(--sl-accent)] hover:text-[var(--sl-accent)] disabled:opacity-25 disabled:cursor-not-allowed transition flex items-center justify-center"
                  aria-label="Decrease rating"
                >
                  −
                </button>

                {/* Rating display */}
                <div className="text-center flex-1">
                  <div className="text-4xl font-bold tracking-tight text-[var(--sl-text)]">
                    {rating.toFixed(1)}
                  </div>
                  <div className="mt-1 flex items-center justify-center gap-2">
                    <span className="text-[var(--sl-accent)] text-sm font-bold tracking-widest">{division} Grade</span>
                    {ratingChanged && (
                      <span className="text-[10px] font-bold tracking-widest text-[var(--sl-text-30)] bg-[var(--sl-surface-deep)] border border-[var(--sl-border)] px-2 py-0.5 rounded">
                        updated
                      </span>
                    )}
                  </div>
                </div>

                {/* Up arrow */}
                <button
                  type="button"
                  onClick={() => setRating(r => adjustRating(r, +RATING_STEP))}
                  disabled={rating >= RATING_MAX}
                  className="w-12 h-12 rounded-xl border border-[var(--sl-border)] text-[var(--sl-text-60)] text-xl font-bold hover:border-[var(--sl-accent)] hover:text-[var(--sl-accent)] disabled:opacity-25 disabled:cursor-not-allowed transition flex items-center justify-center"
                  aria-label="Increase rating"
                >
                  +
                </button>
              </div>

              <p className="text-[var(--sl-text-20)] text-xs text-center mt-4">
                Range {RATING_MIN}–{RATING_MAX} · steps of 0.1
                {ratingChanged && <span className="text-[var(--sl-text-30)]"> · your profile will be updated</span>}
              </p>
            </div>

            {/* Event selection — only if tournament has both */}
            {tournament && tournament.has_singles && tournament.has_doubles && (
              <div className="bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-2xl p-6">
                <p className="text-[10px] font-bold tracking-widest text-[var(--sl-text-30)] mb-4">EVENT</p>
                <div className="space-y-2">
                  {[
                    { value: 'singles' as EventType, label: 'Singles',          fee: tournament.singles_fee },
                    { value: 'doubles' as EventType, label: 'Doubles',          fee: tournament.doubles_fee },
                    { value: 'both'    as EventType, label: 'Singles + Doubles', fee: (tournament.singles_fee ?? 0) + (tournament.doubles_fee ?? 0) },
                  ].map(({ value, label, fee }) => (
                    <label key={value} className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition ${
                      eventType === value
                        ? 'bg-[var(--sl-accent-10)] border-[var(--sl-accent)]'
                        : 'bg-[var(--sl-surface-deep)] border-[var(--sl-border)] hover:border-[var(--sl-text-20)]'
                    }`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="event"
                          value={value}
                          checked={eventType === value}
                          onChange={() => setEventType(value)}
                          className="accent-[var(--sl-accent)]"
                        />
                        <span className="text-sm font-semibold">{label}</span>
                      </div>
                      {fee != null && fee > 0 && (
                        <span className="text-[var(--sl-accent)] font-bold text-sm">${fee}</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Summary + CTA */}
            <div className="bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-2xl p-6">
              <div className="space-y-2 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--sl-text-40)]">Division</span>
                  <span className="text-[var(--sl-accent)] font-bold tracking-widest">{division}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--sl-text-40)]">Entry Fee</span>
                  <span className="text-[var(--sl-accent)] font-bold text-lg">
                    {entryFee != null && entryFee > 0 ? `$${entryFee}` : 'Free'}
                  </span>
                </div>
              </div>

              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={state === 'submitting'}
                className="w-full py-4 rounded-xl bg-[var(--sl-accent)] text-[var(--sl-btn-text)] font-bold tracking-widest text-sm hover:bg-[var(--sl-accent-hover)] transition disabled:opacity-50"
              >
                {state === 'submitting' ? 'REGISTERING...' : 'CONFIRM & CONTINUE'}
              </button>
            </div>

          </div>
        )}

        {/* ── Success ── */}
        {state === 'success' && (
          <div className="bg-[var(--sl-surface)] border border-[var(--sl-accent-30)] rounded-2xl p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--sl-accent-10)] border border-[var(--sl-accent-30)] flex items-center justify-center mx-auto mb-4">
              <span className="text-[var(--sl-accent)] text-xl font-bold">✓</span>
            </div>
            <h2 className="text-base font-bold tracking-widest text-[var(--sl-accent)] mb-2">REGISTERED!</h2>
            <p className="text-[var(--sl-text-40)] text-sm">Redirecting to your dashboard…</p>
          </div>
        )}
      </div>
    </main>
  )
}
