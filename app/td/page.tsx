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

function statusBadge(status: string) {
  const label = STATUS_LABEL[status] ?? status.toUpperCase()
  const isActive = status === 'active'
  const isOpen = status === 'registration_open'
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 999,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.06em',
      background: isActive ? 'var(--sl-accent)' : isOpen ? '#16a34a' : 'var(--sl-surface)',
      color: (isActive || isOpen) ? '#ffffff' : 'var(--sl-text-50)',
      border: (isActive || isOpen) ? 'none' : '1px solid var(--sl-border)',
    }}>{label}</span>
  )
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
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px', fontFamily: "'Assistant', sans-serif" }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 40, gap: 16 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--sl-text-50)', margin: '0 0 6px' }}>
            Tournament Director
          </p>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: 'var(--sl-text)', lineHeight: 1.1, margin: 0 }}>
            My Tournaments
          </h1>
        </div>
        <Link
          href="/td/tournaments/new"
          style={{
            background: 'var(--sl-accent)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: '0.05em',
            padding: '12px 24px',
            borderRadius: 8,
            textDecoration: 'none',
            display: 'inline-block',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          + CREATE TOURNAMENT
        </Link>
      </div>

      {/* Empty state */}
      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 24px', border: '2px dashed var(--sl-border)', borderRadius: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sqshLIFE-logo.png" alt="SQSH.LIFE" style={{ height: 40, display: 'block', margin: '0 auto 20px', opacity: 0.4 }} />
          <p style={{ color: 'var(--sl-text-50)', marginBottom: 24, fontSize: 15 }}>
            No tournaments yet. Create your first one.
          </p>
          <Link
            href="/td/tournaments/new"
            style={{
              background: 'var(--sl-accent)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: '0.08em',
              padding: '12px 28px',
              borderRadius: 8,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            CREATE YOUR FIRST TOURNAMENT
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {list.map(t => {
            const detail = t.tournament_details?.[0]
            const count = regCounts[t.id] ?? 0
            const dateStr = fmtListDate(detail?.start_date, detail?.end_date)
            return (
              <div
                key={t.id}
                style={{
                  background: '#ffffff',
                  borderRadius: 12,
                  boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
                  borderLeft: '4px solid var(--sl-accent)',
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                }}
              >
                <Link
                  href={`/td/tournaments/${t.id}`}
                  style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}
                >
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--sl-text)', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--sl-text-50)', marginBottom: 4 }}>
                    {detail?.clubs?.name ?? 'Venue TBD'}
                    {detail?.clubs?.city ? ` · ${detail.clubs.city}` : ''}
                    {dateStr ? ` · ${dateStr}` : ''}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--sl-text-30)' }}>
                      {count} registered
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--sl-accent)', background: 'var(--sl-accent-10)', padding: '2px 8px', borderRadius: 4 }}>
                      {t.draw_type}
                    </span>
                  </div>
                </Link>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                  {statusBadge(t.status)}
                  <Link
                    href={`/td/tournaments/new?edit=${t.id}`}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      color: 'var(--sl-accent)',
                      border: '1px solid var(--sl-accent)',
                      borderRadius: 6,
                      padding: '4px 12px',
                      textDecoration: 'none',
                      display: 'inline-block',
                    }}
                  >
                    EDIT SETUP
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
