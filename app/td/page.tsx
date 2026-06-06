import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SiteLogo from '@/app/components/SiteLogo'
import ThemeToggle from '@/app/components/ThemeToggle'

const STATUS_LABELS: Record<string, string> = {
  setup_pending:     'SETUP',
  registration_open: 'OPEN',
  active:            'ACTIVE',
  completed:         'COMPLETED',
}

const STATUS_COLORS: Record<string, string> = {
  setup_pending:     'bg-[var(--sl-surface-deep)] text-[var(--sl-text-40)] border-[var(--sl-border)]',
  registration_open: 'bg-green-500/10 text-green-400 border-green-500/20',
  active:            'bg-[var(--sl-accent-10)] text-[var(--sl-accent)] border-[var(--sl-accent-20)]',
  completed:         'bg-[var(--sl-surface-deep)] text-[var(--sl-text-30)] border-[var(--sl-border)]',
}

export default async function TDHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select(`
      id, name, status, draw_type,
      tournament_details(start_date, end_date, singles_fee)
    `)
    .eq('td_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-[var(--sl-bg)] text-[var(--sl-text)]">
      <header className="border-b border-[var(--sl-border)] px-6 py-4 flex items-center justify-between">
        <Link href="/"><SiteLogo /></Link>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-xs font-semibold tracking-widest text-[var(--sl-text-30)] hover:text-[var(--sl-text-60)] transition"
          >
            PLAYER VIEW
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <section className="px-6 py-10 max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="text-[var(--sl-text-30)] text-xs tracking-widest uppercase mb-1">Tournament Director</p>
            <h1 className="text-3xl font-bold tracking-wider">MY TOURNAMENTS</h1>
          </div>
          <Link
            href="/td/tournaments/new"
            className="text-sm font-bold tracking-widest text-[var(--sl-btn-text)] bg-[var(--sl-accent)] px-5 py-3 rounded-xl hover:bg-[var(--sl-accent-hover)] transition"
          >
            + CREATE NEW
          </Link>
        </div>

        {(!tournaments || tournaments.length === 0) ? (
          <div className="text-center py-20 border border-dashed border-[var(--sl-border)] rounded-2xl">
            <p className="text-[var(--sl-text-30)] text-sm mb-6">No tournaments yet.</p>
            <Link
              href="/td/tournaments/new"
              className="inline-block text-sm font-bold tracking-widest text-[var(--sl-accent)] border border-[var(--sl-accent-40)] px-6 py-3 rounded-xl hover:bg-[var(--sl-accent-10)] transition"
            >
              CREATE YOUR FIRST TOURNAMENT
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {tournaments.map((t) => {
              const detail = Array.isArray(t.tournament_details) ? t.tournament_details[0] : t.tournament_details
              const statusKey = t.status ?? 'setup_pending'
              return (
                <Link
                  key={t.id}
                  href={`/td/tournaments/${t.id}`}
                  className="block bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-2xl p-6 hover:border-[var(--sl-accent-30)] transition group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded border ${STATUS_COLORS[statusKey] ?? STATUS_COLORS.setup_pending}`}>
                          {STATUS_LABELS[statusKey] ?? statusKey.toUpperCase()}
                        </span>
                        {t.draw_type && (
                          <span className="text-[10px] tracking-widest text-[var(--sl-text-30)]">{t.draw_type}</span>
                        )}
                      </div>
                      <h2 className="text-lg font-bold tracking-wide group-hover:text-[var(--sl-accent)] transition truncate">
                        {t.name} Dashboard
                      </h2>
                      {detail && (
                        <p className="text-[var(--sl-text-40)] text-xs mt-1">
                          {detail.start_date
                            ? new Date(detail.start_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
                            : 'Date TBD'}
                          {detail.singles_fee ? ` · $${Number(detail.singles_fee).toFixed(0)} entry` : ''}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-[var(--sl-text-20)] group-hover:text-[var(--sl-accent)] transition text-lg">→</span>
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
