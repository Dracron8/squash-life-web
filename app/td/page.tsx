import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type Tournament = {
  id: string
  name: string
  status: string
  draw_type: string
  created_at: string
  tournament_details: {
    start_date: string | null
    end_date: string | null
    courts_available: number | null
    clubs: { name: string; city: string | null } | null
  }[]
}

function fmtListDate(start: string | null, end: string | null): string | null {
  if (!start) return null
  const s = new Date(start).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  if (!end || end === start) return s
  const e = new Date(end).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${s} – ${e}`
}

const STATUS_LABEL: Record<string, string> = {
  setup_pending:     'SETUP',
  registration_open: 'OPEN',
  active:            'ACTIVE',
  completed:         'COMPLETED',
}

const STATUS_COLOR: Record<string, string> = {
  setup_pending:     'bg-neutral-800 text-neutral-400 border-neutral-700',
  registration_open: 'bg-green-900/40 text-green-400 border-green-700/40',
  active:            'bg-red-900/40 text-red-400 border-red-700/40',
  completed:         'bg-neutral-800 text-neutral-500 border-neutral-700',
}

export default async function TDDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, status, draw_type, created_at, tournament_details(start_date, end_date, courts_available, clubs(name, city))')
    .eq('td_id', user.id)
    .order('created_at', { ascending: false })

  const list = (tournaments ?? []) as unknown as Tournament[]

  // Fetch registration counts per tournament
  const ids = list.map(t => t.id)
  const regCounts: Record<string, number> = {}
  if (ids.length > 0) {
    const { data: regs } = await supabase
      .from('registrations')
      .select('tournament_id')
      .in('tournament_id', ids)
    for (const r of regs ?? []) {
      regCounts[r.tournament_id] = (regCounts[r.tournament_id] || 0) + 1
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-bold tracking-widest text-neutral-500 uppercase mb-1">Tournament Director</p>
          <h1 className="text-2xl font-bold tracking-wide">My Tournaments</h1>
        </div>
        <Link
          href="/td/tournaments/new"
          className="bg-red-700 hover:bg-red-600 text-white text-xs font-bold tracking-widest px-5 py-2.5 rounded-xl transition"
        >
          + CREATE TOURNAMENT
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="border border-dashed border-neutral-800 rounded-2xl py-20 text-center">
          <p className="text-neutral-500 text-sm mb-4">No tournaments yet.</p>
          <Link
            href="/td/tournaments/new"
            className="bg-red-700 hover:bg-red-600 text-white text-xs font-bold tracking-widest px-6 py-3 rounded-xl transition"
          >
            CREATE YOUR FIRST TOURNAMENT
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {list.map(t => {
            const detail = t.tournament_details?.[0]
            const count = regCounts[t.id] ?? 0
            const dateStr = fmtListDate(detail?.start_date, detail?.end_date)
            return (
              <div
                key={t.id}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-600 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <Link
                    href={`/td/tournaments/${t.id}`}
                    className="flex-1 min-w-0 block"
                  >
                    <h2 className="font-bold text-sm tracking-wide truncate hover:text-red-400 transition">{t.name}</h2>
                    <p className="text-neutral-500 text-xs mt-1">
                      {detail?.clubs?.name ?? 'Venue TBD'}
                      {detail?.clubs?.city ? ` · ${detail.clubs.city}` : ''}
                      {dateStr ? ` · ${dateStr}` : ''}
                    </p>
                    <p className="text-neutral-600 text-xs mt-1">{count} registered · {t.draw_type}</p>
                  </Link>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-[10px] font-bold tracking-widest px-2.5 py-1 rounded border ${STATUS_COLOR[t.status] ?? STATUS_COLOR.setup_pending}`}>
                      {STATUS_LABEL[t.status] ?? t.status.toUpperCase()}
                    </span>
                    <Link
                      href={`/td/tournaments/new?edit=${t.id}`}
                      className="text-[10px] font-bold tracking-widest text-red-400 border border-red-800 hover:bg-red-900/30 px-3 py-1 rounded-lg transition"
                    >
                      EDIT SETUP
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
