import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ThemeToggle from '@/app/components/ThemeToggle'
import SiteLogo from '@/app/components/SiteLogo'

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
        .select('id')
        .eq('tournament_id', id)
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null }

  const isRegistered = !!reg

  // Derived values
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
    <main className="min-h-screen bg-[var(--sl-bg)] text-[var(--sl-text)]">

      {/* ── Nav ── */}
      <header className="border-b border-[var(--sl-border)] px-6 py-4 flex items-center justify-between" style={{ backgroundColor: 'var(--sl-bg)' }}>
        <Link href="/">
          <SiteLogo />
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href={user ? '/dashboard' : '/login'}
            className="text-sm font-semibold tracking-widest text-[var(--sl-accent)] border border-[var(--sl-accent-40)] px-4 py-2 rounded-lg hover:bg-[var(--sl-accent-10)] transition"
          >
            {user ? 'DASHBOARD' : 'SIGN IN'}
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ── Header row ── */}
        <div className="mb-8">
          <Link href="/" className="text-[var(--sl-text-30)] text-xs tracking-widest hover:text-[var(--sl-text-60)] transition inline-block mb-4">
            ← ALL TOURNAMENTS
          </Link>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-4xl font-bold tracking-wider text-[var(--sl-accent)] leading-tight">{tournament.name}</h1>
            <span className={`shrink-0 text-[10px] font-bold tracking-widest px-3 py-1.5 rounded-lg mt-1 ${
              isOpen
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-[var(--sl-border-faint)] text-[var(--sl-text-40)] border border-[var(--sl-border)]'
            }`}>
              {statusLabel}
            </span>
          </div>
          {isOpen && !isRegistered && (
            <div className="mt-5">
              {user ? (
                <Link
                  href={`/tournament/${id}/register`}
                  className="inline-block px-8 py-4 rounded-xl bg-[var(--sl-accent)] text-[var(--sl-btn-text)] font-bold tracking-widest text-base hover:bg-[var(--sl-accent-hover)] transition"
                >
                  REGISTER →
                </Link>
              ) : (
                <Link
                  href={`/login?next=/tournament/${id}`}
                  className="inline-block px-8 py-4 rounded-xl bg-[var(--sl-accent)] text-[var(--sl-btn-text)] font-bold tracking-widest text-base hover:bg-[var(--sl-accent-hover)] transition"
                >
                  SIGN IN TO REGISTER →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* ── Two-column grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">

          {/* ══ LEFT COLUMN (col-span-2) ══ */}
          <div className="md:col-span-2 space-y-5">


            {/* Combined venue + date/time card */}
            <div className="bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-xl p-5 space-y-4">
              {club && (
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-[var(--sl-text-30)] mb-2">VENUE</p>
                  <p className="font-semibold text-[var(--sl-text)] text-base leading-snug">{club.name}</p>
                  <p className="text-[var(--sl-text-50)] text-sm mt-0.5">
                    {[club.address, club.city, club.province, club.country].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}

              {detail?.start_date && (
                <div className="space-y-1.5">
                  <p className="text-[var(--sl-text-60)] text-sm flex items-center gap-2 flex-wrap">
                    <span>📅</span>
                    <span>
                      {formatDateShort(detail.start_date)}
                      {detail.end_date && detail.end_date !== detail.start_date
                        ? ` — ${formatDateShort(detail.end_date)}`
                        : ''}
                    </span>
                    {dayCount > 1 && (
                      <span className="text-[10px] font-bold tracking-widest text-[var(--sl-text-30)] bg-[var(--sl-border-faint)] px-2 py-0.5 rounded">
                        {dayCount}-DAY EVENT
                      </span>
                    )}
                  </p>
                  {detail.daily_start_time && detail.daily_end_time && (
                    <p className="text-[var(--sl-text-40)] text-sm flex items-center gap-2">
                      <span>🕐</span>
                      <span>First match {formatTime(detail.daily_start_time)} — Last match starts {formatTime(detail.daily_end_time)}</span>
                    </p>
                  )}
                </div>
              )}

              {deadline && (
                <p className={`text-xs font-semibold flex items-center gap-1.5 ${deadlineUrgent ? 'text-red-400' : 'text-[var(--sl-text-30)]'}`}>
                  <span>{deadlineUrgent ? '⚠️' : '📋'}</span>
                  <span>Register by {formatDate(detail!.registration_deadline!)}</span>
                  {daysUntilDeadline !== null && daysUntilDeadline <= 7 && daysUntilDeadline >= 0 && (
                    <span className="font-bold">{daysUntilDeadline === 0 ? '— TODAY' : `— ${daysUntilDeadline}d left`}</span>
                  )}
                </p>
              )}

              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-[var(--sl-accent)] border border-[var(--sl-accent-40)] px-4 py-2 rounded-lg hover:bg-[var(--sl-accent-10)] transition">
                  GET DIRECTIONS ↗
                </a>
              )}
            </div>

            {/* Prize info */}
            {detail?.prize_purse != null && detail.prize_purse > 0 && (
              <div className="bg-[var(--sl-accent-05)] border border-[var(--sl-accent-20)] rounded-xl px-5 py-4 flex items-center gap-3">
                <span className="text-2xl">🏅</span>
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-[var(--sl-accent-60)] mb-0.5">PRIZE PURSE</p>
                  <p className="text-xl font-bold text-[var(--sl-accent)]">${detail.prize_purse.toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>

          {/* ══ RIGHT COLUMN — sticky registration card ══ */}
          <div className="md:col-span-1">
            <div className="md:sticky md:top-4 bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-xl p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-8rem)]">

              {/* Players registered */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold tracking-widest text-[var(--sl-text-30)]">CONFIRMED PLAYERS</p>
                  <p className="text-sm font-semibold text-[var(--sl-text)]">
                    {registered}
                    {capacity != null && <span className="text-[var(--sl-text-30)]"> / {capacity}</span>}
                  </p>
                </div>
                <div className="relative w-full bg-[var(--sl-progress-track)] rounded-full h-2.5 mb-3">
                  <div
                    className="relative bg-[var(--sl-accent)] h-2.5 rounded-full transition-all overflow-visible"
                    style={{ width: capacityPct != null ? `${capacityPct}%` : '0%' }}
                  >
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
                  <p className="text-orange-400 text-xs font-semibold">Filling up fast</p>
                )}
              </div>

              <div className="h-px bg-[var(--sl-border)]" />

              {/* Divisions */}
              <div>
                <p className="text-[10px] font-bold tracking-widest text-[var(--sl-text-30)] mb-2">DIVISIONS</p>
                <div className="flex gap-1">
                  {DIVISIONS.map((d) => (
                    <div key={d.label} className="flex flex-col items-center flex-1 bg-[var(--sl-surface-deep)] border border-[var(--sl-accent-20)] rounded-md px-1 py-1.5">
                      <span className="text-[var(--sl-accent)] font-bold text-[11px] tracking-wide">{d.label}</span>
                      <span className="text-[var(--sl-text-25)] text-[8px] mt-0.5 leading-none">{d.range}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-[var(--sl-border)]" />

              {/* Entry fee */}
              <div>
                <p className="text-[10px] font-bold tracking-widest text-[var(--sl-text-30)] mb-2">ENTRY FEE</p>
                {detail?.has_singles_draw && detail.singles_fee != null && (
                  <div className="flex items-baseline justify-between">
                    <span className="text-[var(--sl-text-50)] text-sm">Singles</span>
                    <span className="text-[var(--sl-accent)] font-bold text-2xl">${detail.singles_fee}</span>
                  </div>
                )}
                {detail?.has_doubles_draw && detail.doubles_fee != null && (
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-[var(--sl-text-50)] text-sm">Doubles</span>
                    <span className="text-[var(--sl-accent)] font-bold text-xl">${detail.doubles_fee}</span>
                  </div>
                )}
              </div>

              {/* CTA button */}
              {isRegistered ? (
                <div className="w-full text-center py-3.5 rounded-xl bg-[var(--sl-accent-10)] border border-[var(--sl-accent-30)] text-[var(--sl-accent)] font-semibold tracking-widest text-sm">
                  ✓ REGISTERED
                </div>
              ) : isOpen ? (
                user ? (
                  <Link
                    href={`/tournament/${id}/register`}
                    className="block w-full text-center py-3.5 rounded-xl bg-[var(--sl-accent)] text-[var(--sl-btn-text)] font-bold tracking-widest text-sm hover:bg-[var(--sl-accent-hover)] transition"
                  >
                    REGISTER →
                  </Link>
                ) : (
                  <>
                    <Link
                      href={`/login?next=/tournament/${id}`}
                      className="block w-full text-center py-3.5 rounded-xl bg-[var(--sl-accent)] text-[var(--sl-btn-text)] font-bold tracking-widest text-sm hover:bg-[var(--sl-accent-hover)] transition"
                    >
                      SIGN IN TO REGISTER
                    </Link>
                    <p className="text-[var(--sl-text-25)] text-xs text-center">Sign in required to register</p>
                  </>
                )
              ) : (
                <div className="w-full text-center py-3.5 rounded-xl bg-[var(--sl-border-faint)] border border-[var(--sl-border)] text-[var(--sl-text-30)] font-semibold tracking-widest text-sm">
                  REGISTRATION CLOSED
                </div>
              )}

              {/* Guaranteed matches — subtle, below button */}
              {isKnockoutPlate && (
                <div className="flex items-start gap-2 bg-[var(--sl-accent-05)] border border-[var(--sl-accent-15)] rounded-lg px-3 py-3">
                  <span className="text-sm shrink-0 mt-0.5">🏆</span>
                  <div>
                    <p className="text-[var(--sl-accent-80)] text-xs font-semibold leading-snug">Two matches guaranteed</p>
                    <p className="text-[var(--sl-accent-40)] text-[10px] mt-0.5">Win or lose your first match, you play again</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>{/* end grid */}
      </div>{/* end max-w */}

      {/* ── Mobile pinned CTA bar ── */}
      {!isRegistered && isOpen && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 border-t border-[var(--sl-border)] backdrop-blur-sm" style={{ backgroundColor: 'var(--sl-mobile-bar)' }}>
          <Link
            href={user ? `/tournament/${id}/register` : `/login?next=/tournament/${id}`}
            className="block w-full text-center py-4 rounded-xl bg-[var(--sl-accent)] text-[var(--sl-btn-text)] font-bold tracking-widest text-sm hover:bg-[var(--sl-accent-hover)] transition"
          >
            {user ? 'REGISTER →' : 'SIGN IN TO REGISTER'}
          </Link>
        </div>
      )}

    </main>
  )
}
