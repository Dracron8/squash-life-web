'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/app/components/ThemeToggle'
import SiteLogo from '@/app/components/SiteLogo'

// ── Constants ────────────────────────────────────────────────────────────────

const RATING_MIN  = 1.50
const RATING_MAX  = 7.00
const RATING_STEP = 0.01

// ── Helpers ──────────────────────────────────────────────────────────────────

function ratingToDivision(r: number): string {
  if (r >= 5.5) return 'OPEN'
  if (r >= 4.5) return 'A'
  if (r >= 3.5) return 'B'
  if (r >= 2.5) return 'C'
  return 'D'
}

function roundToHundredth(n: number): number {
  return Math.round(n * 100) / 100
}

function adjustRating(current: number, delta: number): number {
  const next = roundToHundredth(current + delta)
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
  const params = useParams()
  const id     = params.id as string
  const router = useRouter()

  const [state,      setState]      = useState<PageState>('loading')
  const [tournament, setTournament] = useState<TournamentInfo | null>(null)
  const [player,     setPlayer]     = useState<PlayerProfile | null>(null)
  const [userId,     setUserId]     = useState<string | null>(null)

  const [rating,         setRating]         = useState<number>(3.00)
  const [originalRating, setOriginalRating] = useState<number>(3.00)
  const [eventType,      setEventType]      = useState<EventType>('singles')
  const [error,          setError]          = useState<string | null>(null)
  const [chosenPayment,  setChosenPayment]  = useState<'deposit_paid' | 'fully_paid' | null>(null)

  // ── Load ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace(`/login?next=/tournament/${id}/register`); return }
      setUserId(user.id)

      const { data: tData } = await supabase
        .from('tournaments')
        .select('id, name, tournament_details(singles_fee, doubles_fee, has_singles_draw, has_doubles_draw)')
        .eq('id', id)
        .single()

      if (tData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d = (tData as any).tournament_details?.[0]
        const hasSingles = d?.has_singles_draw ?? true
        const hasDoubles = d?.has_doubles_draw ?? false
        setTournament({
          id: tData.id, name: tData.name,
          singles_fee: d?.singles_fee ?? null,
          doubles_fee: d?.doubles_fee ?? null,
          has_singles: hasSingles,
          has_doubles: hasDoubles,
        })
        setEventType(hasSingles ? 'singles' : 'doubles')
      }

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
        const r = roundToHundredth(Number(profile.usr_rating))
        setRating(r)
        setOriginalRating(r)
        setState('confirm')
      }
    }
    load()
  }, [id, router])

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(paymentStatus: 'deposit_paid' | 'fully_paid') {
    if (!player || !userId || !tournament) return
    setError(null)
    setState('submitting')

    const supabase = createClient()

    if (rating !== originalRating) {
      const { error: updateErr } = await supabase
        .from('players')
        .update({ usr_rating: rating })
        .eq('user_id', userId)
      if (updateErr) { setError(updateErr.message); setState('confirm'); return }
    }

    const { error: insertErr } = await supabase
      .from('registrations')
      .insert({
        tournament_id:  tournament.id,
        user_id:        userId,
        first_name:     player.first_name,
        last_name:      player.last_name,
        usr_rating:     rating,
        division:       ratingToDivision(rating),
        draw_segment:   'main',
        payment_status: paymentStatus,
      })

    if (insertErr) { setError(insertErr.message); setState('confirm'); return }

    setChosenPayment(paymentStatus)
    setState('success')
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const division     = ratingToDivision(rating)
  const ratingChanged = rating !== originalRating

  const entryFee = tournament
    ? eventType === 'singles' ? tournament.singles_fee
    : eventType === 'doubles' ? tournament.doubles_fee
    : (tournament.singles_fee ?? 0) + (tournament.doubles_fee ?? 0)
    : null

  const hasBothEvents = !!(tournament?.has_singles && tournament?.has_doubles)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[var(--sl-bg)] text-[var(--sl-text)] flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-[var(--sl-border)] px-6 py-3 flex items-center justify-between" style={{ backgroundColor: 'var(--sl-bg)' }}>
        <Link href="/"><SiteLogo /></Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link href={`/tournament/${id}`} className="text-xs font-semibold tracking-widest text-[var(--sl-text-30)] hover:text-[var(--sl-text-60)] transition">
            ← BACK
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full">

        {/* Title */}
        <div className="mb-4 shrink-0">
          <p className="text-[var(--sl-text-30)] text-[10px] tracking-widest uppercase mb-0.5">Registration</p>
          <h1 className="text-xl font-bold tracking-wider leading-tight">{tournament?.name ?? '...'}</h1>
        </div>

        {/* ── Loading ── */}
        {state === 'loading' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[var(--sl-accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ── Incomplete profile ── */}
        {state === 'incomplete' && (
          <div className="bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-2xl p-8 text-center">
            <div className="w-10 h-10 rounded-full bg-[var(--sl-accent-10)] border border-[var(--sl-accent-30)] flex items-center justify-center mx-auto mb-3">
              <span className="text-[var(--sl-accent)] text-lg font-bold">!</span>
            </div>
            <h2 className="text-sm font-bold tracking-widest mb-2">COMPLETE YOUR PROFILE FIRST</h2>
            <p className="text-[var(--sl-text-40)] text-sm mb-5 leading-relaxed">
              We need your name and Club Locker rating to place you in the right division.
            </p>
            <Link
              href={`/profile?next=/tournament/${id}/register`}
              className="inline-block text-sm font-bold tracking-widest text-[var(--sl-btn-text)] bg-[var(--sl-accent)] px-6 py-2.5 rounded-xl hover:bg-[var(--sl-accent-hover)] transition"
            >
              COMPLETE PROFILE
            </Link>
          </div>
        )}

        {/* ── Confirm ── */}
        {(state === 'confirm' || state === 'submitting') && player && (
          <div className="flex flex-col gap-3">

            {/* Combined details + rating card */}
            <div className="bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-2xl p-4">
              {/* Name / Club rows */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
                <span className="text-[var(--sl-text-40)] text-xs">Name</span>
                <span className="font-semibold text-right text-xs">{player.first_name} {player.last_name}</span>
                {player.club_name && <>
                  <span className="text-[var(--sl-text-40)] text-xs">Club</span>
                  <span className="font-medium text-right text-xs truncate">{player.club_name}</span>
                </>}
              </div>

              <div className="h-px bg-[var(--sl-border)] mb-4" />

              {/* Rating editor */}
              <div className="flex items-center gap-3">
                <div className="shrink-0">
                  <p className="text-[10px] font-bold tracking-widest text-[var(--sl-text-30)] mb-1">RATING (USR)</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRating(r => adjustRating(r, -RATING_STEP))}
                      disabled={rating <= RATING_MIN}
                      className="w-8 h-8 rounded-lg border border-[var(--sl-border)] text-[var(--sl-text-60)] font-bold hover:border-[var(--sl-accent)] hover:text-[var(--sl-accent)] disabled:opacity-25 disabled:cursor-not-allowed transition text-base flex items-center justify-center"
                    >−</button>

                    <span className="text-2xl font-bold tracking-tight w-16 text-center tabular-nums">
                      {rating.toFixed(2)}
                    </span>

                    <button
                      type="button"
                      onClick={() => setRating(r => adjustRating(r, +RATING_STEP))}
                      disabled={rating >= RATING_MAX}
                      className="w-8 h-8 rounded-lg border border-[var(--sl-border)] text-[var(--sl-text-60)] font-bold hover:border-[var(--sl-accent)] hover:text-[var(--sl-accent)] disabled:opacity-25 disabled:cursor-not-allowed transition text-base flex items-center justify-center"
                    >+</button>
                  </div>
                  <p className="text-[var(--sl-text-20)] text-[10px] mt-1">
                    {RATING_MIN.toFixed(2)}–{RATING_MAX.toFixed(2)} · ±0.01
                  </p>
                </div>

                {/* Division badge */}
                <div className="flex-1 flex flex-col items-end gap-1">
                  <span className="text-[10px] font-bold tracking-widest text-[var(--sl-text-30)]">DIVISION</span>
                  <span className="text-3xl font-bold text-[var(--sl-accent)] tracking-wider">{division}</span>
                  {ratingChanged && (
                    <span className="text-[10px] font-bold tracking-widest text-[var(--sl-text-30)] bg-[var(--sl-surface-deep)] border border-[var(--sl-border)] px-2 py-0.5 rounded">
                      profile will update
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-[var(--sl-border)]">
                <Link
                  href={`/profile?next=/tournament/${id}/register`}
                  className="text-[10px] text-[var(--sl-text-30)] hover:text-[var(--sl-accent)] transition"
                >
                  Wrong name or club? Update your profile →
                </Link>
              </div>
            </div>

            {/* Event selection — only if both */}
            {hasBothEvents && tournament && (
              <div className="bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-2xl p-4">
                <p className="text-[10px] font-bold tracking-widest text-[var(--sl-text-30)] mb-3">EVENT</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'singles' as EventType, label: 'Singles',  fee: tournament.singles_fee },
                    { value: 'doubles' as EventType, label: 'Doubles',  fee: tournament.doubles_fee },
                    { value: 'both'    as EventType, label: 'Both',     fee: (tournament.singles_fee ?? 0) + (tournament.doubles_fee ?? 0) },
                  ] as const).map(({ value, label, fee }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setEventType(value)}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-bold tracking-widest transition text-center ${
                        eventType === value
                          ? 'bg-[var(--sl-accent-10)] border-[var(--sl-accent)] text-[var(--sl-accent)]'
                          : 'border-[var(--sl-border)] text-[var(--sl-text-40)] hover:border-[var(--sl-text-20)] hover:text-[var(--sl-text-60)]'
                      }`}
                    >
                      <div>{label}</div>
                      {fee != null && fee > 0 && (
                        <div className="font-bold mt-0.5">${fee}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Summary + CTA */}
            <div className="bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-[var(--sl-text-40)] text-sm">Entry Fee</span>
                  <span className="text-[var(--sl-accent)] font-bold text-xl">
                    {entryFee != null && entryFee > 0 ? `$${entryFee}` : 'Free'}
                  </span>
                </div>
                <span className="text-[var(--sl-text-30)] text-xs">
                  {division} Grade · {rating.toFixed(2)} USR
                </span>
              </div>

              {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSubmit('deposit_paid')}
                  disabled={state === 'submitting'}
                  className="py-3.5 rounded-xl border-2 border-[var(--sl-accent)] text-[var(--sl-accent)] font-bold tracking-widest text-xs hover:bg-[var(--sl-accent-10)] transition disabled:opacity-50"
                >
                  {state === 'submitting' ? '...' : 'PAY DEPOSIT'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit('fully_paid')}
                  disabled={state === 'submitting'}
                  className="py-3.5 rounded-xl bg-[var(--sl-accent)] text-[var(--sl-btn-text)] font-bold tracking-widest text-xs hover:bg-[var(--sl-accent-hover)] transition disabled:opacity-50"
                >
                  {state === 'submitting' ? '...' : 'PAY IN FULL'}
                </button>
              </div>
              <p className="text-[var(--sl-text-20)] text-[10px] text-center tracking-wide mt-1">
                Payment processing coming soon
              </p>
            </div>

          </div>
        )}

        {/* ── Success ── */}
        {state === 'success' && player && tournament && (
          <div className="flex flex-col gap-4">

            {/* Confirmation banner */}
            <div className="bg-[var(--sl-surface)] border border-[var(--sl-accent-30)] rounded-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--sl-accent-10)] border border-[var(--sl-accent-30)] flex items-center justify-center mx-auto mb-4">
                <span className="text-[var(--sl-accent)] text-xl font-bold">✓</span>
              </div>
              <h2 className="text-base font-bold tracking-widest text-[var(--sl-accent)] mb-3">YOU&apos;RE ON THE LIST!</h2>
              <p className="text-[var(--sl-text-50)] text-sm leading-relaxed">
                Payment processing coming soon —<br />
                we&apos;ll confirm your spot once payment is received.
              </p>
            </div>

            {/* Registration details */}
            <div className="bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-2xl p-5">
              <p className="text-[10px] font-bold tracking-widest text-[var(--sl-text-30)] mb-4">REGISTRATION DETAILS</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <span className="text-[var(--sl-text-40)] text-xs">Name</span>
                <span className="font-semibold text-right text-xs">{player.first_name} {player.last_name}</span>

                <span className="text-[var(--sl-text-40)] text-xs">Tournament</span>
                <span className="font-semibold text-right text-xs leading-snug">{tournament.name}</span>

                <span className="text-[var(--sl-text-40)] text-xs">Division</span>
                <span className="font-bold text-right text-xs text-[var(--sl-accent)]">{ratingToDivision(rating)} ({rating.toFixed(2)} USR)</span>

                <span className="text-[var(--sl-text-40)] text-xs">Entry Fee</span>
                <span className="font-bold text-right text-xs text-[var(--sl-accent)]">
                  {entryFee != null && entryFee > 0 ? `$${entryFee}` : 'Free'}
                </span>

                <span className="text-[var(--sl-text-40)] text-xs">Payment</span>
                <span className={`font-bold text-right text-xs ${chosenPayment === 'fully_paid' ? 'text-green-400' : 'text-yellow-400'}`}>
                  {chosenPayment === 'fully_paid' ? 'Pay in Full' : 'Deposit'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="w-full py-4 rounded-xl bg-[var(--sl-accent)] text-[var(--sl-btn-text)] font-bold tracking-widest text-sm hover:bg-[var(--sl-accent-hover)] transition"
            >
              GO TO MY DASHBOARD
            </button>

          </div>
        )}

      </div>
    </main>
  )
}
