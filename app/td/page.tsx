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
  completed:         'DONE',
}

const STATUS_BADGE: Record<string, string> = {
  setup_pending:     'bg-gray-100 text-gray-500 border border-gray-200',
  registration_open: 'bg-green-50 text-green-700 border border-green-200',
  active:            'bg-red-600 text-white border border-red-600',
  completed:         'bg-gray-50 text-gray-400 border border-gray-200',
}

const ACCENT_BAR: Record<string, string> = {
  setup_pending:     'bg-gray-200',
  registration_open: 'bg-green-400',
  active:            'bg-red-600',
  completed:         'bg-gray-200',
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
    <div className="max-w-4xl mx-auto px-6 py-12">

      {/* ── Page header ── */}
      <div className="flex items-end justify-between mb-10 gap-4">
        <div>
          <p className="text-xs font-black tracking-[0.2em] text-red-600 uppercase mb-2">
            Tournament Director
          </p>
          <h1 className="text-[2.75rem] font-black tracking-tight text-gray-900 leading-none">
            My Tournaments
          </h1>
        </div>
        <Link
          href="/td/tournaments/new"
          className="shrink-0 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black tracking-widest text-sm px-7 py-3.5 rounded-2xl transition-colors shadow-lg shadow-red-600/25"
        >
          + CREATE TOURNAMENT
        </Link>
      </div>

      {/* ── Empty state ── */}
      {list.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-3xl py-28 text-center">
          <p className="text-3xl font-black text-gray-200 mb-3">No tournaments yet</p>
          <p className="text-gray-400 text-sm mb-10">Create your first tournament to get started.</p>
          <Link
            href="/td/tournaments/new"
            className="bg-red-600 hover:bg-red-700 text-white font-black tracking-widest text-sm px-8 py-4 rounded-2xl transition-colors inline-block shadow-lg shadow-red-600/25"
          >
            CREATE YOUR FIRST TOURNAMENT
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(t => {
            const detail = t.tournament_details?.[0]
            const count = regCounts[t.id] ?? 0
            const dateStr = fmtListDate(detail?.start_date, detail?.end_date)

            return (
              <div
                key={t.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="flex">
                  {/* Left accent bar */}
                  <div className={`w-1 flex-shrink-0 ${ACCENT_BAR[t.status] ?? ACCENT_BAR.setup_pending}`} />

                  <div className="flex-1 flex items-center gap-4 px-6 py-5 min-w-0">
                    {/* Tournament info — links to detail page */}
                    <Link
                      href={`/td/tournaments/${t.id}`}
                      className="flex-1 min-w-0 block group"
                    >
                      <h2 className="text-base font-black text-gray-900 group-hover:text-red-600 transition-colors leading-snug truncate">
                        {t.name}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-2 mt-1.5 text-sm text-gray-500">
                        {detail?.clubs?.name && (
                          <span className="font-semibold text-gray-700">{detail.clubs.name}</span>
                        )}
                        {detail?.clubs?.city && (
                          <span className="text-gray-400">{detail.clubs.city}</span>
                        )}
                        {dateStr && (
                          <>
                            <span className="text-gray-200 select-none">·</span>
                            <span>{dateStr}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-gray-400">{t.draw_type}</span>
                        <span className="text-gray-200 select-none">·</span>
                        <span className="text-xs font-bold text-gray-500">
                          {count} player{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </Link>

                    {/* Status badge + edit button */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`text-[10px] font-black tracking-widest px-2.5 py-1 rounded-lg ${STATUS_BADGE[t.status] ?? STATUS_BADGE.setup_pending}`}>
                        {STATUS_LABEL[t.status] ?? t.status.toUpperCase()}
                      </span>
                      <Link
                        href={`/td/tournaments/new?edit=${t.id}`}
                        className="text-[10px] font-bold tracking-widest text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-400 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                      >
                        EDIT SETUP
                      </Link>
                    </div>
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
