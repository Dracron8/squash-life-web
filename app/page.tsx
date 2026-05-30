import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ThemeToggle from '@/app/components/ThemeToggle'
import SiteLogo from '@/app/components/SiteLogo'

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
    <main className="min-h-screen bg-[var(--sl-bg)] text-[var(--sl-text)]">
      <header className="border-b border-[var(--sl-border)] px-6 py-4 flex items-center justify-between" style={{ backgroundColor: 'var(--sl-bg)' }}>
        <Link href="/">
          <SiteLogo />
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-sm font-semibold tracking-widest text-[var(--sl-accent)] border border-[var(--sl-accent-40)] px-4 py-2 rounded-lg hover:bg-[var(--sl-accent-10)] transition"
          >
            SIGN IN
          </Link>
        </div>
      </header>

      <section className="px-6 py-12 max-w-4xl mx-auto">
        <p className="text-[var(--sl-text-40)] text-xs tracking-widest uppercase mb-2">Open &amp; Upcoming</p>
        <h2 className="text-3xl font-bold tracking-wider text-[var(--sl-text)] mb-8">TOURNAMENTS</h2>

        {!tournaments || tournaments.length === 0 ? (
          <p className="text-[var(--sl-text-30)] text-sm">No open tournaments at this time.</p>
        ) : (
          <div className="grid gap-4">
            {(tournaments as unknown as Tournament[]).map((t) => {
              const detail = t.tournament_details?.[0]
              return (
                <Link
                  key={t.id}
                  href={`/tournament/${t.id}`}
                  className="block bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-2xl p-6 hover:border-[var(--sl-accent-40)] hover:bg-[var(--sl-surface-hover)] transition group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold tracking-wide text-[var(--sl-text)] group-hover:text-[var(--sl-accent)] transition">
                        {t.name}
                      </h3>
                      {detail?.clubs?.name && (
                        <p className="text-[var(--sl-text-40)] text-sm mt-1">{detail.clubs.name}</p>
                      )}
                      {detail?.singles_fee != null && (
                        <p className="text-[var(--sl-text-30)] text-xs mt-1">Entry: ${detail.singles_fee}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {detail?.start_date && (
                        <p className="text-[var(--sl-text-60)] text-sm">
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
                            : 'bg-[var(--sl-border-faint)] text-[var(--sl-text-40)] border border-[var(--sl-border)]'
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
