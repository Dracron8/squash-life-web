import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type Props = { params: Promise<{ id: string }> }

type TournamentDetail = {
  start_date: string | null
  end_date: string | null
  singles_fee: number | null
  doubles_fee: number | null
  courts_available: number | null
  match_duration_minutes: number | null
  daily_start_time: string | null
  daily_end_time: string | null
  has_singles_draw: boolean | null
  has_doubles_draw: boolean | null
  max_players: number | null
  prize_purse: number | null
  registration_deadline: string | null
  clubs: {
    name: string
    address: string
    city: string | null
    province: string | null
    country: string | null
  } | null
}

type Tournament = {
  id: string
  name: string
  status: string
  draw_type: string
  tournament_details: TournamentDetail[]
}

function formatTime(t: string): string {
  const [hourStr, minuteStr] = t.split(':')
  const hour = parseInt(hourStr, 10)
  const minute = (minuteStr ?? '00').padStart(2, '0')
  const period = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${minute} ${period}`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const DIVISIONS = [
  { label: 'OPEN', range: '5.5+' },
  { label: 'A',    range: '4.5–5.49' },
  { label: 'B',    range: '3.5–4.49' },
  { label: 'C',    range: '2.5–3.49' },
  { label: 'D',    range: '<2.5' },
]

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

export default async function TournamentPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: { user } },
    { data: t },
    { count: playerCount },
  ] = await Promise.all([
    supabase.auth.getUser(),

    supabase
      .from('tournaments')
      .select(`
        id,
        name,
        status,
        draw_type,
        tournament_details (
          start_date,
          end_date,
          singles_fee,
          doubles_fee,
          courts_available,
          match_duration_minutes,
          daily_start_time,
          daily_end_time,
          has_singles_draw,
          has_doubles_draw,
          max_players,
          prize_purse,
          registration_deadline,
          clubs (
            name,
            address,
            city,
            province,
            country
          )
        )
      `)
      .eq('id', id)
      .single(),

    supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', id)
      .in('payment_status', ['deposit_paid', 'fully_paid']),
  ])

  if (!t) notFound()

  const tournament = t as unknown as Tournament
  const detail = tournament.tournament_details?.[0] ?? null
  const club = detail?.clubs ?? null

  const { data: reg } = user
    ? await supabase
        .from('registrations')
        .select('id, payment_status')
        .eq('tournament_id', id)
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null }

  const isRegistered = !!reg
  const paymentStatus = reg?.payment_status as string | undefined

  const statusLabel = tournament.status === 'registration_open' ? 'OPEN' : tournament.status.replace(/_/g, ' ').toUpperCase()
  const isOpen = tournament.status === 'registration_open'
  const isKnockoutPlate = tournament.draw_type === 'Knockout + Plate'

  const dayCount = detail?.start_date && detail?.end_date
    ? Math.ceil((new Date(detail.end_date).getTime() - new Date(detail.start_date).getTime()) / 86400000) + 1
    : 1

  const capacity = detail?.max_players ?? (detail?.courts_available ? detail.courts_available * 8 : null)
  const registered = playerCount ?? 0
  const capacityPct = capacity ? Math.min(100, Math.round((registered / capacity) * 100)) : null

  const deadline = detail?.registration_deadline ? new Date(detail.registration_deadline) : null
  const daysUntilDeadline = deadline
    ? Math.ceil((deadline.getTime() - Date.now()) / 86400000)
    : null
  const deadlineUrgent = daysUntilDeadline !== null && daysUntilDeadline <= 7 && daysUntilDeadline >= 0

  const mapsUrl = club
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        [club.address, club.city, club.province, club.country].filter(Boolean).join(', ')
      )}`
    : null

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
        backgroundColor: '#1a0a0a',
      }}>

        {/* HEADER */}
        <div className="flex items-center justify-between px-8 py-4"
          style={{ borderBottom: '1px solid rgba(192,57,43,0.25)', backdropFilter: 'blur(12px)' }}>
          <Link href="/" className="flex flex-col items-start">
            <img src="/sqshLIFE-logo.png" alt="SQSH.LIFE" className="h-12 w-auto" />
            <p className="text-sm font-bold tracking-[0.22em] uppercase mt-0.5" style={{ color: '#222' }}>
              Tournament
            </p>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/tournaments"
              className="text-[10px] font-bold tracking-[0.14em] uppercase px-4 py-2 rounded-lg transition hover:opacity-80"
              style={{ color: '#C0392B', border: '1.5px solid rgba(192,57,43,0.4)' }}>
              ← ALL TOURNAMENTS
            </Link>
            {user ? (
              <Link href="/dashboard"
                className="text-[10px] font-bold tracking-[0.14em] uppercase px-4 py-2 rounded-lg transition hover:opacity-80"
                style={{ color: '#C0392B', border: '1.5px solid rgba(192,57,43,0.4)' }}>
                MY DASHBOARD
              </Link>
            ) : (
              <Link href="/login"
                className="text-[10px] font-bold tracking-[0.14em] uppercase px-4 py-2 rounded-lg transition hover:opacity-80"
                style={{ color: '#C0392B', border: '1.5px solid rgba(192,57,43,0.4)' }}>
                SIGN IN
              </Link>
            )}
          </div>
        </div>

        {/* CONTENT */}
        <div className="max-w-5xl mx-auto px-8 py-8">

          {/* Title row */}
          <div className="mb-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-[10px] font-bold tracking-[0.14em] uppercase mb-1" style={{ color: 'rgba(0,0,0,0.4)' }}>
                  Tournament
                </p>
                <h1 className="text-2xl font-bold tracking-[0.14em]" style={{ color: '#111' }}>{tournament.name}</h1>
              </div>
              <span className="shrink-0 mt-1 inline-block text-[10px] font-bold tracking-[0.14em] px-3 py-1.5 rounded-lg"
                style={isOpen
                  ? { background: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.2)' }
                  : { background: 'rgba(255,255,255,0.18)', color: '#888', border: '1.5px solid rgba(192,57,43,0.2)' }}>
                {statusLabel}
              </span>
            </div>
            {isOpen && !isRegistered && (
              <Link
                href={user ? `/tournament/${id}/register` : `/login?next=/tournament/${id}`}
                className="inline-block px-8 py-4 rounded-xl text-sm font-bold tracking-[0.14em] uppercase text-white transition hover:opacity-90"
                style={{ background: '#C0392B' }}>
                {user ? 'REGISTER →' : 'SIGN IN TO REGISTER →'}
              </Link>
            )}
          </div>

          {/* Two-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

            {/* LEFT — venue + dates + prize */}
            <div className="md:col-span-2 space-y-4">

              {/* Venue + date/time card */}
              <div className="rounded-2xl p-5 space-y-4" style={CARD_STYLE}>
                {club && (
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.14em] uppercase mb-2" style={{ color: 'rgba(0,0,0,0.4)' }}>VENUE</p>
                    <p className="font-semibold text-base leading-snug" style={{ color: '#111' }}>{club.name}</p>
                    <p className="text-sm mt-0.5" style={{ color: '#666' }}>
                      {[club.address, club.city, club.province, club.country].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}

                {detail?.start_date && (
                  <div className="space-y-1.5">
                    <p className="text-sm flex items-center gap-2 flex-wrap" style={{ color: '#444' }}>
                      <span>📅</span>
                      <span>
                        {formatDateShort(detail.start_date)}
                        {detail.end_date && detail.end_date !== detail.start_date
                          ? ` — ${formatDateShort(detail.end_date)}`
                          : ''}
                      </span>
                      {dayCount > 1 && (
                        <span className="text-[10px] font-bold tracking-[0.14em] uppercase px-2 py-0.5 rounded"
                          style={{ background: 'rgba(192,57,43,0.1)', color: '#C0392B' }}>
                          {dayCount}-DAY EVENT
                        </span>
                      )}
                    </p>
                    {detail.daily_start_time && detail.daily_end_time && (
                      <p className="text-sm flex items-center gap-2" style={{ color: '#666' }}>
                        <span>🕐</span>
                        <span>First match {formatTime(detail.daily_start_time)} — Last match starts {formatTime(detail.daily_end_time)}</span>
                      </p>
                    )}
                  </div>
                )}

                {deadline && (
                  <p className="text-xs font-semibold flex items-center gap-1.5"
                    style={{ color: deadlineUrgent ? '#C0392B' : 'rgba(0,0,0,0.4)' }}>
                    <span>{deadlineUrgent ? '⚠️' : '📋'}</span>
                    <span>Register by {formatDate(detail!.registration_deadline!)}</span>
                    {daysUntilDeadline !== null && daysUntilDeadline <= 7 && daysUntilDeadline >= 0 && (
                      <span className="font-bold">{daysUntilDeadline === 0 ? '— TODAY' : `— ${daysUntilDeadline}d left`}</span>
                    )}
                  </p>
                )}

                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.14em] uppercase px-4 py-2 rounded-lg transition hover:opacity-80"
                    style={{ color: '#C0392B', border: '1.5px solid rgba(192,57,43,0.4)' }}>
                    GET DIRECTIONS ↗
                  </a>
                )}
              </div>

              {/* Prize purse */}
              {detail?.prize_purse != null && detail.prize_purse > 0 && (
                <div className="rounded-2xl px-5 py-4 flex items-center gap-3"
                  style={{ background: 'rgba(192,57,43,0.05)', border: '1.5px solid rgba(192,57,43,0.2)', backdropFilter: 'blur(12px)' }}>
                  <span className="text-2xl">🏅</span>
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.14em] uppercase mb-0.5" style={{ color: 'rgba(192,57,43,0.6)' }}>PRIZE PURSE</p>
                    <p className="text-xl font-bold" style={{ color: '#C0392B' }}>${detail.prize_purse.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT — registration card */}
            <div className="md:col-span-1">
              <div className="md:sticky md:top-4 rounded-2xl p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-8rem)]" style={CARD_STYLE}>

                {/* Players registered */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold tracking-[0.14em] uppercase" style={{ color: 'rgba(0,0,0,0.4)' }}>CONFIRMED PLAYERS</p>
                    <p className="text-sm font-semibold" style={{ color: '#111' }}>
                      {registered}
                      {capacity != null && <span style={{ color: 'rgba(0,0,0,0.35)' }}> / {capacity}</span>}
                    </p>
                  </div>
                  <div className="relative w-full rounded-full h-2.5 mb-3" style={{ background: 'rgba(192,57,43,0.15)' }}>
                    <div
                      className="relative h-2.5 rounded-full transition-all overflow-visible"
                      style={{ width: capacityPct != null ? `${capacityPct}%` : '0%', background: '#C0392B' }}>
                      {registered > 0 && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src="/sqsh-icon.png"
                          alt=""
                          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 object-contain pointer-events-none"
                        />
                      )}
                    </div>
                  </div>
                  {capacityPct != null && capacityPct >= 80 && (
                    <p className="text-xs font-semibold text-orange-500">Filling up fast</p>
                  )}
                </div>

                <div className="h-px" style={{ background: 'rgba(192,57,43,0.2)' }} />

                {/* Divisions */}
                <div>
                  <p className="text-[10px] font-bold tracking-[0.14em] uppercase mb-2" style={{ color: 'rgba(0,0,0,0.4)' }}>DIVISIONS</p>
                  <div className="flex gap-1">
                    {DIVISIONS.map((d) => (
                      <div key={d.label} className="flex flex-col items-center flex-1 rounded-md px-1 py-1.5"
                        style={{ background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.2)' }}>
                        <span className="font-bold text-[11px] tracking-wide" style={{ color: '#C0392B' }}>{d.label}</span>
                        <span className="text-[8px] mt-0.5 leading-none" style={{ color: 'rgba(0,0,0,0.35)' }}>{d.range}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="h-px" style={{ background: 'rgba(192,57,43,0.2)' }} />

                {/* Entry fee */}
                <div>
                  <p className="text-[10px] font-bold tracking-[0.14em] uppercase mb-2" style={{ color: 'rgba(0,0,0,0.4)' }}>ENTRY FEE</p>
                  {detail?.has_singles_draw && detail.singles_fee != null && (
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm" style={{ color: '#666' }}>Singles</span>
                      <span className="font-bold text-2xl" style={{ color: '#C0392B' }}>${detail.singles_fee}</span>
                    </div>
                  )}
                  {detail?.has_doubles_draw && detail.doubles_fee != null && (
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-sm" style={{ color: '#666' }}>Doubles</span>
                      <span className="font-bold text-xl" style={{ color: '#C0392B' }}>${detail.doubles_fee}</span>
                    </div>
                  )}
                </div>

                {/* CTA button */}
                {isRegistered ? (
                  <>
                    <div className="w-full text-center py-3.5 rounded-xl text-sm font-bold tracking-[0.14em] uppercase"
                      style={{ background: 'rgba(192,57,43,0.1)', border: '1.5px solid rgba(192,57,43,0.3)', color: '#C0392B' }}>
                      ✓ REGISTERED
                    </div>
                    {paymentStatus === 'waitlist' && (
                      <div className="flex items-center gap-2 text-xs font-medium" style={{ color: '#dc2626' }}>
                        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#dc2626', flexShrink: 0 }} />
                        Waitlist — payment required to secure your spot
                      </div>
                    )}
                    {paymentStatus === 'deposit_paid' && (
                      <div className="flex items-center gap-2 text-xs font-medium" style={{ color: '#ca8a04' }}>
                        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#ca8a04', flexShrink: 0 }} />
                        Deposit Paid — balance due at the door
                      </div>
                    )}
                    {paymentStatus === 'fully_paid' && (
                      <div className="flex items-center gap-2 text-xs font-medium" style={{ color: '#16a34a' }}>
                        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
                        Fully Paid — you&apos;re all set
                      </div>
                    )}
                  </>
                ) : isOpen ? (
                  user ? (
                    <Link
                      href={`/tournament/${id}/register`}
                      className="block w-full text-center py-3.5 rounded-xl text-sm font-bold tracking-[0.14em] uppercase text-white transition hover:opacity-90"
                      style={{ background: '#C0392B' }}>
                      REGISTER →
                    </Link>
                  ) : (
                    <>
                      <Link
                        href={`/login?next=/tournament/${id}`}
                        className="block w-full text-center py-3.5 rounded-xl text-sm font-bold tracking-[0.14em] uppercase text-white transition hover:opacity-90"
                        style={{ background: '#C0392B' }}>
                        SIGN IN TO REGISTER
                      </Link>
                      <p className="text-[10px] text-center" style={{ color: 'rgba(0,0,0,0.35)' }}>Sign in required to register</p>
                    </>
                  )
                ) : (
                  <div className="w-full text-center py-3.5 rounded-xl text-sm font-bold tracking-[0.14em] uppercase"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(192,57,43,0.2)', color: '#888' }}>
                    REGISTRATION CLOSED
                  </div>
                )}

                {/* Guaranteed matches */}
                {isKnockoutPlate && (
                  <div className="flex items-start gap-2 rounded-lg px-3 py-3"
                    style={{ background: 'rgba(192,57,43,0.05)', border: '1px solid rgba(192,57,43,0.15)' }}>
                    <span className="text-sm shrink-0 mt-0.5">🏆</span>
                    <div>
                      <p className="text-xs font-semibold leading-snug" style={{ color: 'rgba(192,57,43,0.8)' }}>Two matches guaranteed</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'rgba(192,57,43,0.4)' }}>Win or lose your first match, you play again</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
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
