import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type Tournament = {
  id: string
  name: string
  status: string
  tournament_details: Array<{
    start_date: string | null
    singles_fee: number | null
    clubs: {
      name: string
    } | null
  }>
}

export default async function Home() {
  const supabase = await createClient()

  const { data: tournaments, error } = await supabase
    .from('tournaments')
    .select(`
      id,
      name,
      status,
      tournament_details (
        start_date,
        singles_fee,
        clubs (
          name
        )
      )
    `)
    .eq('status', 'registration_open')
    .order('created_at', { ascending: true })

  console.log('tournaments:', tournaments, 'error:', error)

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-widest text-[#c9a84c]" style={{ fontFamily: 'Georgia, serif' }}>
          SQUASH LIFE
        </h1>
        <Link
          href="/login"
          className="text-sm font-semibold tracking-widest text-[#c9a84c] border border-[#c9a84c]/40 px-4 py-2 rounded-lg hover:bg-[#c9a84c]/10 transition"
        >
          SIGN IN
        </Link>
      </header>

      <section className="px-6 py-12 max-w-4xl mx-auto">
        <p className="text-white/40 text-xs tracking-widest uppercase mb-2">Open &amp; Upcoming</p>
        <h2 className="text-3xl font-bold tracking-wider text-white mb-8">TOURNAMENTS</h2>

        {!tournaments || tournaments.length === 0 ? (
          <p className="text-white/30 text-sm">No open tournaments at this time.</p>
        ) : (
          <div className="grid gap-4">
            {(tournaments as unknown as Tournament[]).map((t) => {
              const detail = t.tournament_details?.[0]
              return (
                <Link
                  key={t.id}
                  href={`/tournament/${t.id}`}
                  className="block bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 hover:border-[#c9a84c]/40 hover:bg-[#1f1f1f] transition group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold tracking-wide group-hover:text-[#c9a84c] transition">
                        {t.name}
                      </h3>
                      {detail?.clubs?.name && (
                        <p className="text-white/40 text-sm mt-1">{detail.clubs.name}</p>
                      )}
                      {detail?.singles_fee != null && (
                        <p className="text-white/30 text-xs mt-1">Entry: ${detail.singles_fee}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {detail?.start_date && (
                        <p className="text-white/60 text-sm">
                          {new Date(detail.start_date).toLocaleDateString('en-AU', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                      <span
                        className={`inline-block mt-2 text-[10px] font-bold tracking-widest px-2 py-1 rounded ${
                          t.status === 'registration_open'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-white/5 text-white/40 border border-white/10'
                        }`}
                      >
                        {t.status === 'registration_open' ? 'OPEN' : t.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
