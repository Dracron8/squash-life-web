'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Match = {
  id: string
  scheduled_time: string | null
  court: string | null
  status: string
  player1_id: string
  player2_id: string
  winner_id: string | null
  score: string | null
  division: string | null
  round: number | null
  tournaments: { name: string } | null
}

type Registration = {
  id: string
  division: string | null
  payment_status: string
  tournaments: { id: string; name: string; tournament_details: { start_date: string | null }[] } | null
}

const PAYMENT_MSG: Record<string, { label: string; sub: string; color: string }> = {
  fully_paid:   { label: 'Registered ✓', sub: 'Fully paid',                              color: '#16a34a' },
  deposit_paid: { label: 'Deposit Received', sub: 'Spot guaranteed, balance due at door', color: '#ca8a04' },
  waitlist:     { label: 'Deposit Required', sub: 'You are on the waitlist',              color: '#888' },
}

type Player = {
  first_name: string
  last_name: string
  usr_rating: string | null
}

const SIDEBAR_STYLE = {
  background: 'linear-gradient(to bottom, #1a0a0a, #2a1010, #111)',
  borderTop: '4px solid #C0392B',
  borderBottom: '4px solid #C0392B',
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [player, setPlayer] = useState<Player | null>(null)
  const [authName, setAuthName] = useState<string | null>(null)
  const [isTD, setIsTD] = useState(false)
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])

  useEffect(() => {
    const supabase = createClient()

    async function fetchData(userId: string) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', userId)
        .maybeSingle()
      setIsTD(profile?.user_role === 'td' || profile?.user_role === 'both')

      const [{ data: p }, { data: m }, { data: r }] = await Promise.all([
        supabase
          .from('players')
          .select('first_name, last_name, usr_rating')
          .eq('user_id', userId)
          .maybeSingle(),

        supabase
          .from('matches')
          .select('id, scheduled_time, court, status, player1_id, player2_id, winner_id, score, division, round, tournaments(name)')
          .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
          .is('winner_id', null)
          .not('scheduled_time', 'is', null)
          .order('scheduled_time', { ascending: true })
          .limit(5),

        supabase
          .from('registrations')
          .select('id, division, payment_status, tournaments(id, name, tournament_details(start_date))')
          .eq('user_id', userId)
          .order('registered_at', { ascending: false })
          .limit(10),
      ])

      setPlayer(p ?? null)
      setUpcomingMatches((m as unknown as Match[]) ?? [])
      setRegistrations((r as unknown as Registration[]) ?? [])
    }

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setAuthName(user.user_metadata?.full_name ?? user.email ?? null)
      await fetchData(user.id)
      setLoading(false)
    }

    init()
  }, [router])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const displayName = player
    ? player.first_name
    : (authName?.split(' ')[0] ?? 'Player')

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <div className="w-[70px] flex-shrink-0" style={SIDEBAR_STYLE} />
        <div
          className="flex-1 flex items-center justify-center"
          style={{ backgroundImage: "url('/COURTNFLOOR.png')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#1a0a0a' }}
        >
          <div className="w-8 h-8 border-2 border-[#C0392B] border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="w-[70px] flex-shrink-0" style={SIDEBAR_STYLE} />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">

      {/* LEFT SIDEBAR */}
      <div className="w-[70px] flex-shrink-0 relative" style={SIDEBAR_STYLE}>
        <div
          className="absolute bottom-0 left-0 right-0 h-[220px] pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(192,57,43,0.45), transparent)' }}
        />
      </div>

      {/* MAIN — scrollable */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          backgroundImage: "url('/COURTNFLOOR.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center 70%',
          backgroundAttachment: 'fixed',
          backgroundColor: '#1a0a0a',
        }}
      >
        {/* ── HEADER ── */}
        <div
          className="flex items-center justify-between px-8 py-4"
          style={{ borderBottom: '1px solid rgba(192,57,43,0.25)', backdropFilter: 'blur(12px)' }}
        >
          <Link href="/" className="flex flex-col items-start">
            <img src="/sqshLIFE-logo.png" alt="SQSH.LIFE" className="h-12 w-auto" />
            <p className="text-sm font-bold tracking-[0.22em] uppercase mt-0.5" style={{ color: '#222' }}>
              Player Dashboard
            </p>
          </Link>
          <div className="flex items-center gap-3">
            {isTD && (
              <Link href="/td"
                className="text-[10px] font-bold tracking-[0.14em] uppercase px-4 py-2 rounded-lg transition hover:opacity-80"
                style={{ color: '#C0392B', border: '1.5px solid rgba(192,57,43,0.4)' }}>
                TD DASHBOARD
              </Link>
            )}
            <button
              onClick={handleSignOut}
              className="text-[10px] font-bold tracking-[0.14em] transition hover:opacity-60"
              style={{ color: '#C0392B' }}
            >
              SIGN OUT
            </button>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className="max-w-2xl mx-auto px-8 py-8">

          {/* Welcome */}
          <div
            className="rounded-2xl px-6 py-5 mb-5"
            style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(12px)', border: '1.5px solid rgba(192,57,43,0.3)' }}
          >
            <p className="text-[10px] font-bold tracking-[0.14em] uppercase mb-1" style={{ color: 'rgba(0,0,0,0.45)' }}>
              Welcome back
            </p>
            <h1 className="text-2xl font-bold tracking-[0.14em]" style={{ color: '#111' }}>
              {displayName.toUpperCase()}
            </h1>
            {player?.usr_rating && (
              <p className="text-sm mt-1 tracking-[0.14em] font-bold" style={{ color: '#C0392B' }}>
                USR {player.usr_rating}
              </p>
            )}
          </div>

          {/* Complete profile banner */}
          {!player && (
            <div
              className="mb-5 rounded-2xl p-5 flex items-start justify-between gap-4"
              style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(12px)', border: '1.5px solid rgba(192,57,43,0.4)' }}
            >
              <div>
                <p className="text-sm font-bold tracking-[0.14em] mb-1" style={{ color: '#C0392B' }}>
                  COMPLETE YOUR PROFILE
                </p>
                <p className="text-sm" style={{ color: '#444' }}>
                  Add your Club Locker rating and squash details so tournament registration is instant.
                </p>
              </div>
              <Link
                href="/profile"
                className="shrink-0 text-xs font-bold tracking-[0.14em] text-white px-4 py-2.5 rounded-xl transition hover:opacity-90"
                style={{ background: '#C0392B' }}
              >
                SET UP →
              </Link>
            </div>
          )}

          {/* Upcoming Matches */}
          <div className="mb-5">
            <h2 className="text-[10px] font-bold tracking-[0.14em] uppercase mb-3" style={{ color: '#222' }}>
              Upcoming Matches
            </h2>
            {upcomingMatches.length === 0 ? (
              <div
                className="rounded-2xl px-6 py-4"
                style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(12px)', border: '1.5px solid rgba(192,57,43,0.3)' }}
              >
                <p className="text-sm" style={{ color: '#666' }}>No scheduled matches.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {upcomingMatches.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-2xl p-5"
                    style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(12px)', border: '1.5px solid rgba(192,57,43,0.3)' }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold tracking-[0.14em]" style={{ color: '#C0392B' }}>
                        {m.division ?? 'OPEN'} — RD {m.round ?? '?'}
                      </span>
                      {m.court && (
                        <span className="text-[10px] tracking-[0.14em]" style={{ color: '#888' }}>
                          Court {m.court}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold" style={{ color: '#111' }}>{m.tournaments?.name ?? 'Tournament'}</p>
                    {m.scheduled_time && (
                      <p className="text-xs mt-1" style={{ color: '#666' }}>
                        {new Date(m.scheduled_time).toLocaleString('en-AU', {
                          weekday: 'short', day: 'numeric', month: 'short',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Tournaments */}
          <div className="mb-8">
            <h2 className="text-[10px] font-bold tracking-[0.14em] uppercase mb-3" style={{ color: '#222' }}>
              My Tournaments
            </h2>
            {registrations.length === 0 ? (
              <div
                className="rounded-2xl px-6 py-8 text-center"
                style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(12px)', border: '1.5px solid rgba(192,57,43,0.3)' }}
              >
                <p className="text-sm mb-4" style={{ color: '#666' }}>
                  You haven&apos;t entered any tournaments yet.
                </p>
                <Link
                  href="/tournaments"
                  className="inline-block text-sm font-bold tracking-[0.14em] text-white px-6 py-3 rounded-xl transition hover:opacity-90"
                  style={{ background: '#C0392B' }}
                >
                  BROWSE TOURNAMENTS
                </Link>
              </div>
            ) : (
              <div className="grid gap-3">
                {registrations.map((r) => {
                  const pm = PAYMENT_MSG[r.payment_status] ?? { label: r.payment_status.toUpperCase(), sub: '', color: '#888' }
                  return (
                    <Link
                      key={r.id}
                      href={`/tournament/${r.tournaments?.id}`}
                      className="block rounded-2xl p-5 transition hover:opacity-80"
                      style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(12px)', border: '1.5px solid rgba(192,57,43,0.3)' }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-sm tracking-[0.14em]" style={{ color: '#111' }}>{r.tournaments?.name}</p>
                          {r.division && (
                            <span className="text-[10px] font-bold tracking-[0.14em] mt-1 inline-block" style={{ color: '#C0392B' }}>
                              {r.division}
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] font-bold tracking-[0.14em]" style={{ color: pm.color }}>{pm.label}</p>
                          {pm.sub && (
                            <p className="text-[9px] mt-0.5 leading-snug max-w-[140px] text-right" style={{ color: '#888' }}>
                              {pm.sub}
                            </p>
                          )}
                        </div>
                      </div>
                      {r.tournaments?.tournament_details?.[0]?.start_date && (
                        <p className="text-xs mt-2" style={{ color: '#666' }}>
                          {new Date(r.tournaments.tournament_details[0].start_date).toLocaleDateString('en-AU', {
                            day: 'numeric', month: 'long', year: 'numeric',
                          })}
                        </p>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* RIGHT SIDEBAR */}
      <div className="w-[70px] flex-shrink-0 relative" style={SIDEBAR_STYLE}>
        <div
          className="absolute bottom-0 left-0 right-0 h-[220px] pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(192,57,43,0.45), transparent)' }}
        />
      </div>

    </div>
  )
}
