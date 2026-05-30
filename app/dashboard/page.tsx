'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const kDevPlayerId = '00000000-0000-0000-0000-000000000002'

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
  status: string
  tournaments: { id: string; name: string; start_date: string | null } | null
}

type Player = {
  first_name: string
  last_name: string
  usr_rating: string | null
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isDevMode, setIsDevMode] = useState(false)
  const [player, setPlayer] = useState<Player | null>(null)
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])

  useEffect(() => {
    const supabase = createClient()

    async function fetchData(userId: string) {
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
          .select('id, division, status, tournaments(id, name, start_date)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      setPlayer(p ?? null)
      setUpcomingMatches((m as unknown as Match[]) ?? [])
      setRegistrations((r as unknown as Registration[]) ?? [])
    }

    async function init() {
      const devMode = localStorage.getItem('devMode') === 'true'

      if (devMode) {
        setIsDevMode(true)
        await fetchData(kDevPlayerId)
        setLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

      await fetchData(user.id)
      setLoading(false)
    }

    init()
  }, [router])

  const handleSignOut = async () => {
    if (isDevMode) {
      localStorage.removeItem('devMode')
      router.push('/login')
      return
    }
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const displayName = player
    ? `${player.first_name} ${player.last_name}`
    : 'Player'

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold tracking-widest text-[#d4af37]" style={{ fontFamily: 'Georgia, serif' }}>
          SQUASH LIFE
        </Link>
        <button
          onClick={handleSignOut}
          className="text-xs font-semibold tracking-widest text-white/30 hover:text-white/60 transition"
        >
          SIGN OUT
        </button>
      </header>

      <section className="px-6 py-10 max-w-3xl mx-auto">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-1">
            <p className="text-white/30 text-xs tracking-widest uppercase">Welcome back</p>
            {isDevMode && (
              <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded border border-dashed border-white/20 text-white/20">
                DEV MODE
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-wider">{displayName.toUpperCase()}</h1>
          {player?.usr_rating && (
            <p className="text-[#d4af37] text-sm mt-1 tracking-widest">USR {player.usr_rating}</p>
          )}
        </div>

        {/* Upcoming matches */}
        <div className="mb-10">
          <h2 className="text-xs font-bold tracking-widest text-white/40 uppercase mb-4">Upcoming Matches</h2>
          {upcomingMatches.length === 0 ? (
            <p className="text-white/20 text-sm">No scheduled matches.</p>
          ) : (
            <div className="grid gap-3">
              {upcomingMatches.map((m) => (
                <div key={m.id} className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold tracking-widest text-[#d4af37]">
                      {m.division ?? 'OPEN'} — RD {m.round ?? '?'}
                    </span>
                    {m.court && (
                      <span className="text-[10px] tracking-widest text-white/30">Court {m.court}</span>
                    )}
                  </div>
                  <p className="text-white/80 text-sm">
                    {m.tournaments?.name ?? 'Tournament'}
                  </p>
                  {m.scheduled_time && (
                    <p className="text-white/40 text-xs mt-1">
                      {new Date(m.scheduled_time).toLocaleString('en-AU', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Registrations */}
        <div className="mb-10">
          <h2 className="text-xs font-bold tracking-widest text-white/40 uppercase mb-4">My Tournaments</h2>
          {registrations.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-white/20 text-sm mb-4">You haven&apos;t entered any tournaments yet.</p>
              <Link
                href="/"
                className="inline-block text-sm font-bold tracking-widest text-[#d4af37] border border-[#d4af37]/40 px-6 py-3 rounded-xl hover:bg-[#d4af37]/10 transition"
              >
                BROWSE TOURNAMENTS
              </Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {registrations.map((r) => (
                <Link
                  key={r.id}
                  href={`/tournament/${r.tournaments?.id}`}
                  className="block bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 hover:border-[#d4af37]/30 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm tracking-wide">{r.tournaments?.name}</p>
                      {r.division && (
                        <span className="text-[10px] font-bold tracking-widest text-[#d4af37] mt-1 inline-block">
                          {r.division}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold tracking-widest px-2 py-1 rounded ${
                        r.status === 'confirmed'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-white/5 text-white/30 border border-white/10'
                      }`}
                    >
                      {r.status.toUpperCase()}
                    </span>
                  </div>
                  {r.tournaments?.start_date && (
                    <p className="text-white/30 text-xs mt-2">
                      {new Date(r.tournaments.start_date).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
