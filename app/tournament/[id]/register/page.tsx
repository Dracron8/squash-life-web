'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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

function formatTime(t: string): string {
  const [hourStr, minuteStr] = t.split(':')
  const hour = parseInt(hourStr, 10)
  const minute = (minuteStr ?? '00').padStart(2, '0')
  const period = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${minute} ${period}`
}

function formatDateShort(d: string): string {
  return new Date(d).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
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
  id:               string
  name:             string
  singles_fee:      number | null
  doubles_fee:      number | null
  has_singles:      boolean
  has_doubles:      boolean
  start_date:       string | null
  end_date:         string | null
  daily_start_time: string | null
  daily_end_time:   string | null
  venue_name:       string | null
  venue_address:    string | null
  venue_city:       string | null
  venue_province:   string | null
  venue_country:    string | null
}

type EventType = 'singles' | 'doubles' | 'both'
type PageState = 'loading' | 'incomplete' | 'confirm' | 'submitting' | 'success'

function isProfileComplete(p: PlayerProfile): boolean {
  return !!(p.first_name.trim() && p.last_name.trim() && p.usr_rating != null)
}

const SIDEBAR_STYLE = {
  background: 'linear-gradient(to bottom, #1a0a0a, #2a1010, #111)',
  borderTop: '4px solid #C0392B',
  borderBottom: '4px solid #C0392B',
}

const CARD_STYLE = {
  background: 'rgba(255,255,255,0.18)',
  backdropFilter: 'blur(12px)',
  border: '1.5px solid rgba(192,57,43,0.3)',
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
        .select('id, name, tournament_details(singles_fee, doubles_fee, has_singles_draw, has_doubles_draw, start_date, end_date, daily_start_time, daily_end_time, clubs(name, address, city, province, country))')
        .eq('id', id)
        .single()

      if (tData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d = (tData as any).tournament_details?.[0]
        const club = d?.clubs ?? null
        const hasSingles = d?.has_singles_draw ?? true
        const hasDoubles = d?.has_doubles_draw ?? false
        setTournament({
          id: tData.id, name: tData.name,
          singles_fee:      d?.singles_fee ?? null,
          doubles_fee:      d?.doubles_fee ?? null,
          has_singles:      hasSingles,
          has_doubles:      hasDoubles,
          start_date:       d?.start_date       ?? null,
          end_date:         d?.end_date         ?? null,
          daily_start_time: d?.daily_start_time ?? null,
          daily_end_time:   d?.daily_end_time   ?? null,
          venue_name:       club?.name          ?? null,
          venue_address:    club?.address       ?? null,
          venue_city:       club?.city          ?? null,
          venue_province:   club?.province      ?? null,
          venue_country:    club?.country       ?? null,
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

  const mapsUrl = tournament?.venue_address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        [tournament.venue_address, tournament.venue_city, tournament.venue_province, tournament.venue_country].filter(Boolean).join(', ')
      )}`
    : null

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden">

      {/* LEFT SIDEBAR */}
      <div className="w-[70px] flex-shrink-0 relative" style={SIDEBAR_STYLE}>
        <div className="absolute bottom-0 left-0 right-0 h-[220px] pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(192,57,43,0.45), transparent)' }} />
      </div>

      {/* MAIN */}
      <div className="flex-1 overflow-y-auto" style={{
        backgroundImage: "url('/COURTNFLOOR.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center 70%',
        backgroundAttachment: 'fixed',
        backgroundColor: '#1a0a0a',
      }}>

        {/* HEADER */}
        <div className="flex items-center justify-between px-8 py-4"
          style={{ borderBottom: '1px solid rgba(192,57,43,0.25)', backdropFilter: 'blur(12px)' }}>
          <Link href="/" className="flex flex-col items-start">
            <img src="/sqshLIFE-logo.png" alt="SQSH.LIFE" className="h-12 w-auto" />
            <p className="text-sm font-bold tracking-[0.22em] uppercase mt-0.5" style={{ color: '#222' }}>
              Registration
            </p>
          </Link>
          <Link href={`/tournament/${id}`}
            className="text-[10px] font-bold tracking-[0.14em] uppercase px-4 py-2 rounded-lg transition hover:opacity-80"
            style={{ color: '#C0392B', border: '1.5px solid rgba(192,57,43,0.4)' }}>
            ← BACK
          </Link>
        </div>

        {/* CONTENT */}
        <div className="max-w-4xl mx-auto px-8 py-8">

          <p className="text-[10px] font-bold tracking-[0.14em] uppercase mb-1" style={{ color: 'rgba(0,0,0,0.4)' }}>Registration</p>
          <h1 className="text-xl font-bold tracking-[0.14em] mb-6" style={{ color: '#111' }}>{tournament?.name ?? '…'}</h1>

          {/* Loading */}
          {state === 'loading' && (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#C0392B] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Incomplete profile */}
          {state === 'incomplete' && (
            <div className="max-w-md mx-auto rounded-2xl p-8 text-center" style={CARD_STYLE}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: 'rgba(192,57,43,0.1)', border: '1.5px solid rgba(192,57,43,0.3)' }}>
                <span className="text-lg font-bold" style={{ color: '#C0392B' }}>!</span>
              </div>
              <h2 className="text-sm font-bold tracking-[0.14em] uppercase mb-2" style={{ color: '#111' }}>COMPLETE YOUR PROFILE FIRST</h2>
              <p className="text-sm mb-5 leading-relaxed" style={{ color: '#666' }}>
                We need your name and Club Locker rating to place you in the right division.
              </p>
              <Link
                href={`/profile?next=/tournament/${id}/register`}
                className="inline-block text-sm font-bold tracking-[0.14em] uppercase text-white px-6 py-2.5 rounded-xl transition hover:opacity-90"
                style={{ background: '#C0392B' }}>
                COMPLETE PROFILE
              </Link>
            </div>
          )}

          {/* Two-column layout */}
          {(state === 'confirm' || state === 'submitting' || state === 'success') && player && tournament && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">

              {/* LEFT — Tournament info */}
              <div className="rounded-2xl p-5 space-y-4" style={CARD_STYLE}>
                <p className="text-[10px] font-bold tracking-[0.14em] uppercase" style={{ color: 'rgba(0,0,0,0.4)' }}>TOURNAMENT INFO</p>

                {tournament.venue_name && (
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.14em] uppercase mb-1" style={{ color: 'rgba(0,0,0,0.4)' }}>VENUE</p>
                    <p className="font-semibold text-sm leading-snug" style={{ color: '#111' }}>{tournament.venue_name}</p>
                    {tournament.venue_address && (
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#666' }}>
                        {[tournament.venue_address, tournament.venue_city, tournament.venue_province, tournament.venue_country].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                )}

                {tournament.start_date && (
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.14em] uppercase mb-1" style={{ color: 'rgba(0,0,0,0.4)' }}>DATE</p>
                    <p className="text-sm" style={{ color: '#444' }}>
                      {formatDateShort(tournament.start_date)}
                      {tournament.end_date && tournament.end_date !== tournament.start_date
                        ? ` — ${formatDateShort(tournament.end_date)}`
                        : ''}
                    </p>
                  </div>
                )}

                {tournament.daily_start_time && tournament.daily_end_time && (
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.14em] uppercase mb-1" style={{ color: 'rgba(0,0,0,0.4)' }}>MATCH TIMES</p>
                    <p className="text-sm" style={{ color: '#444' }}>
                      {formatTime(tournament.daily_start_time)} — {formatTime(tournament.daily_end_time)}
                    </p>
                  </div>
                )}

                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.14em] uppercase px-4 py-2 rounded-lg transition hover:opacity-80"
                    style={{ color: '#C0392B', border: '1.5px solid rgba(192,57,43,0.4)' }}>
                    GET DIRECTIONS ↗
                  </a>
                )}
              </div>

              {/* RIGHT — Registration form or success */}
              <div className="flex flex-col gap-4">

                {/* Confirm / Submitting */}
                {(state === 'confirm' || state === 'submitting') && (
                  <>
                    {/* Player details + rating */}
                    <div className="rounded-2xl p-4" style={CARD_STYLE}>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
                        <span className="text-xs" style={{ color: '#888' }}>Name</span>
                        <span className="font-semibold text-right text-xs" style={{ color: '#111' }}>{player.first_name} {player.last_name}</span>
                        {player.club_name && <>
                          <span className="text-xs" style={{ color: '#888' }}>Club</span>
                          <span className="font-medium text-right text-xs truncate" style={{ color: '#111' }}>{player.club_name}</span>
                        </>}
                      </div>

                      <div className="h-px mb-4" style={{ background: 'rgba(192,57,43,0.2)' }} />

                      {/* Rating editor */}
                      <div className="flex items-center gap-3">
                        <div className="shrink-0">
                          <p className="text-[10px] font-bold tracking-[0.14em] uppercase mb-1" style={{ color: 'rgba(0,0,0,0.4)' }}>RATING (USR)</p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setRating(r => adjustRating(r, -RATING_STEP))}
                              disabled={rating <= RATING_MIN}
                              className="w-8 h-8 rounded-lg font-bold disabled:opacity-25 disabled:cursor-not-allowed transition text-base flex items-center justify-center"
                              style={{ border: '1.5px solid rgba(192,57,43,0.4)', color: '#C0392B' }}>−</button>
                            <span className="text-2xl font-bold tracking-tight w-16 text-center tabular-nums" style={{ color: '#111' }}>
                              {rating.toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setRating(r => adjustRating(r, +RATING_STEP))}
                              disabled={rating >= RATING_MAX}
                              className="w-8 h-8 rounded-lg font-bold disabled:opacity-25 disabled:cursor-not-allowed transition text-base flex items-center justify-center"
                              style={{ border: '1.5px solid rgba(192,57,43,0.4)', color: '#C0392B' }}>+</button>
                          </div>
                          <p className="text-[10px] mt-1" style={{ color: '#888' }}>Verify Current Rating</p>
                        </div>

                        {/* Division badge */}
                        <div className="flex-1 flex flex-col items-end gap-1">
                          <span className="text-[10px] font-bold tracking-[0.14em] uppercase" style={{ color: 'rgba(0,0,0,0.4)' }}>DIVISION</span>
                          <span className="text-3xl font-bold tracking-wider" style={{ color: '#C0392B' }}>{division}</span>
                          {ratingChanged && (
                            <span className="text-[10px] font-bold tracking-[0.14em] px-2 py-0.5 rounded"
                              style={{ color: '#C0392B', background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.2)' }}>
                              profile will update
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(192,57,43,0.15)' }}>
                        <Link
                          href={`/profile?next=/tournament/${id}/register`}
                          className="text-[10px] transition hover:underline"
                          style={{ color: '#C0392B' }}>
                          Wrong name or club? Update your profile →
                        </Link>
                      </div>
                    </div>

                    {/* Event selection */}
                    {hasBothEvents && (
                      <div className="rounded-2xl p-4" style={CARD_STYLE}>
                        <p className="text-[10px] font-bold tracking-[0.14em] uppercase mb-3" style={{ color: 'rgba(0,0,0,0.4)' }}>EVENT</p>
                        <div className="grid grid-cols-3 gap-2">
                          {([
                            { value: 'singles' as EventType, label: 'Singles', fee: tournament.singles_fee },
                            { value: 'doubles' as EventType, label: 'Doubles', fee: tournament.doubles_fee },
                            { value: 'both'    as EventType, label: 'Both',    fee: (tournament.singles_fee ?? 0) + (tournament.doubles_fee ?? 0) },
                          ] as const).map(({ value, label, fee }) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setEventType(value)}
                              className="px-3 py-2.5 rounded-xl text-xs font-bold tracking-[0.14em] uppercase transition text-center"
                              style={eventType === value
                                ? { background: 'rgba(192,57,43,0.1)', border: '1.5px solid #C0392B', color: '#C0392B' }
                                : { border: '1.5px solid rgba(192,57,43,0.3)', color: '#666' }}>
                              <div>{label}</div>
                              {fee != null && fee > 0 && <div className="font-bold mt-0.5">${fee}</div>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Entry fee + payment buttons */}
                    <div className="rounded-2xl p-4" style={CARD_STYLE}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-sm" style={{ color: '#666' }}>Entry Fee</span>
                          <span className="font-bold text-xl" style={{ color: '#C0392B' }}>
                            {entryFee != null && entryFee > 0 ? `$${entryFee}` : 'Free'}
                          </span>
                        </div>
                        <span className="text-xs" style={{ color: '#888' }}>
                          {division} Grade · {rating.toFixed(2)} USR
                        </span>
                      </div>

                      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => handleSubmit('deposit_paid')}
                          disabled={state === 'submitting'}
                          className="py-3.5 rounded-xl font-bold tracking-[0.14em] uppercase text-xs transition disabled:opacity-50"
                          style={{ border: '2px solid #C0392B', color: '#C0392B' }}>
                          {state === 'submitting' ? '…' : 'PAY DEPOSIT'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSubmit('fully_paid')}
                          disabled={state === 'submitting'}
                          className="py-3.5 rounded-xl font-bold tracking-[0.14em] uppercase text-xs text-white transition hover:opacity-90 disabled:opacity-50"
                          style={{ background: '#C0392B' }}>
                          {state === 'submitting' ? '…' : 'PAY IN FULL'}
                        </button>
                      </div>
                      <p className="text-[10px] text-center tracking-wide mt-1" style={{ color: '#888' }}>
                        Payment processing coming soon
                      </p>
                    </div>
                  </>
                )}

                {/* Success */}
                {state === 'success' && (
                  <>
                    <div className="rounded-2xl p-6 text-center" style={{ ...CARD_STYLE, border: '1.5px solid rgba(192,57,43,0.3)' }}>
                      <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                        style={{ background: 'rgba(192,57,43,0.1)', border: '1.5px solid rgba(192,57,43,0.3)' }}>
                        <span className="text-xl font-bold" style={{ color: '#C0392B' }}>✓</span>
                      </div>
                      <h2 className="text-base font-bold tracking-[0.14em] uppercase mb-3" style={{ color: '#111' }}>YOU&apos;RE ON THE LIST!</h2>
                      <p className="text-sm leading-relaxed" style={{ color: '#666' }}>
                        Payment processing coming soon —<br />
                        we&apos;ll confirm your spot once payment is received.
                      </p>
                    </div>

                    <div className="rounded-2xl p-5" style={CARD_STYLE}>
                      <p className="text-[10px] font-bold tracking-[0.14em] uppercase mb-4" style={{ color: 'rgba(0,0,0,0.4)' }}>REGISTRATION DETAILS</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <span className="text-xs" style={{ color: '#888' }}>Name</span>
                        <span className="font-semibold text-right text-xs" style={{ color: '#111' }}>{player.first_name} {player.last_name}</span>

                        <span className="text-xs" style={{ color: '#888' }}>Tournament</span>
                        <span className="font-semibold text-right text-xs leading-snug" style={{ color: '#111' }}>{tournament.name}</span>

                        <span className="text-xs" style={{ color: '#888' }}>Division</span>
                        <span className="font-bold text-right text-xs" style={{ color: '#C0392B' }}>{ratingToDivision(rating)} ({rating.toFixed(2)} USR)</span>

                        <span className="text-xs" style={{ color: '#888' }}>Entry Fee</span>
                        <span className="font-bold text-right text-xs" style={{ color: '#C0392B' }}>
                          {entryFee != null && entryFee > 0 ? `$${entryFee}` : 'Free'}
                        </span>

                        <span className="text-xs" style={{ color: '#888' }}>Payment</span>
                        <span className={`font-bold text-right text-xs ${chosenPayment === 'fully_paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                          {chosenPayment === 'fully_paid' ? 'Pay in Full' : 'Deposit'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => router.push('/dashboard')}
                      className="w-full py-4 rounded-xl text-sm font-bold tracking-[0.14em] uppercase text-white transition hover:opacity-90"
                      style={{ background: '#C0392B' }}>
                      GO TO MY DASHBOARD
                    </button>
                  </>
                )}

              </div>
            </div>
          )}

        </div>
      </div>

      {/* RIGHT SIDEBAR */}
      <div className="w-[70px] flex-shrink-0 relative" style={SIDEBAR_STYLE}>
        <div className="absolute bottom-0 left-0 right-0 h-[220px] pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(192,57,43,0.45), transparent)' }} />
      </div>

    </div>
  )
}
