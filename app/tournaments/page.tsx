import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type Tournament = {
  id: string
  name: string
  status: string
  tournament_details: Array<{
    start_date: string | null
    singles_fee: number | null
    clubs: { name: string } | null
  }>
}

const SIDEBAR_STYLE = {
  background: 'linear-gradient(to bottom, #1a0a0a, #2a1010, #111)',
  borderTop: '4px solid #C0392B',
  borderBottom: '4px solid #C0392B',
}

export default async function TournamentsPage() {
  const supabase = await createClient()

  const [{ data: tournaments }, { data: { user } }] = await Promise.all([
    supabase
      .from('tournaments')
      .select(`id, name, status, tournament_details (start_date, singles_fee, clubs (name))`)
      .eq('status', 'registration_open')
      .order('created_at', { ascending: true }),
    supabase.auth.getUser(),
  ])

  let isTD = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .maybeSingle()
    isTD = profile?.user_role === 'td' || profile?.user_role === 'both'
  }

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
          <Link href="/tournaments" className="flex flex-col items-start">
            <img src="/sqshLIFE-logo.png" alt="SQSH.LIFE" className="h-12 w-auto" />
            <p className="text-sm font-bold tracking-[0.22em] uppercase mt-0.5" style={{ color: '#222' }}>
              Tournaments
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
        <div className="max-w-2xl mx-auto px-8 py-8">

          <p className="text-[10px] font-bold tracking-[0.14em] uppercase mb-1" style={{ color: 'rgba(0,0,0,0.4)' }}>
            Open &amp; Upcoming
          </p>
          <h2 className="text-2xl font-bold tracking-[0.14em] mb-6" style={{ color: '#111' }}>TOURNAMENTS</h2>

          {!tournaments || tournaments.length === 0 ? (
            <div className="rounded-2xl px-6 py-8 text-center"
              style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(12px)', border: '1.5px solid rgba(192,57,43,0.3)' }}>
              <p className="text-sm" style={{ color: '#666' }}>No open tournaments at this time.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {(tournaments as unknown as Tournament[]).map((t) => {
                const detail = t.tournament_details?.[0]
                return (
                  <div key={t.id} className="rounded-2xl p-6 transition hover:opacity-90"
                    style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(12px)', border: '1.5px solid rgba(192,57,43,0.3)' }}>
                    <div className="flex items-start justify-between gap-4">
                      <Link href={`/tournament/${t.id}`} className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold tracking-[0.14em]" style={{ color: '#111' }}>{t.name}</h3>
                        {detail?.clubs?.name && (
                          <p className="text-xs mt-1" style={{ color: '#666' }}>{detail.clubs.name}</p>
                        )}
                        {detail?.singles_fee != null && (
                          <p className="text-xs mt-1" style={{ color: '#888' }}>Entry: ${detail.singles_fee}</p>
                        )}
                      </Link>
                      <div className="text-right shrink-0">
                        {detail?.start_date && (
                          <p className="text-xs" style={{ color: '#666' }}>
                            {new Date(detail.start_date).toLocaleDateString('en-AU', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </p>
                        )}
                        <span className="inline-block mt-1 text-[10px] font-bold tracking-[0.14em] px-2 py-1 rounded"
                          style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.2)' }}>
                          OPEN
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(192,57,43,0.2)' }}>
                      <Link href={`/tournament/${t.id}/register`}
                        className="block w-full text-center py-3 rounded-xl text-sm font-bold tracking-[0.14em] uppercase text-white transition hover:opacity-90"
                        style={{ background: '#C0392B' }}>
                        REGISTER →
                      </Link>
                    </div>
                  </div>
                )
              })}
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
