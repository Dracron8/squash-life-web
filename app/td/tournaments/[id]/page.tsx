'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import SiteLogo from '@/app/components/SiteLogo'
import ThemeToggle from '@/app/components/ThemeToggle'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tournament = {
  id: string
  name: string
  status: string
  draw_type: string
  td_id: string
  tournament_details: TournamentDetail[]
}

type TournamentDetail = {
  start_date: string | null
  end_date: string | null
  singles_fee: number | null
  max_players: number | null
  registration_deadline: string | null
  courts_available: number | null
  match_duration_minutes: number | null
  min_rest_minutes: number | null
  has_singles_draw: boolean | null
  has_doubles_draw: boolean | null
  clubs: { name: string; address: string; city: string | null } | null
}

type Registration = {
  id: string
  user_id: string
  first_name: string
  last_name: string
  usr_rating: number | null
  division: string | null
  draw_segment: string
  payment_status: string
  registered_at: string
  club_name?: string
}

type Match = {
  id: string
  round_number: number
  draw_segment: string
  division: string
  player1_id: string | null
  player2_id: string | null
  winner_id: string | null
  score: string | null
  match_index: number
  next_match_id: string | null
}

type PlayerMap = Record<string, string>

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = ['REGISTRATIONS', 'DRAW', 'SCORE ENTRY', 'SETTINGS'] as const
type Tab = typeof TABS[number]

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

const PAY_COLORS: Record<string, string> = {
  fully_paid:   'text-green-400',
  deposit_paid: 'text-yellow-400',
  waitlist:     'text-[var(--sl-text-40)]',
  pending:      'text-[var(--sl-text-40)]',
}

const PAY_CYCLE: Record<string, string> = {
  waitlist:     'deposit_paid',
  deposit_paid: 'fully_paid',
  fully_paid:   'waitlist',
  pending:      'deposit_paid',
}

function dotColor(status: string): string {
  if (status === 'fully_paid')   return '#22c55e'
  if (status === 'deposit_paid') return '#eab308'
  return '#ef4444'
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TournamentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [playerMap, setPlayerMap] = useState<PlayerMap>({})
  const [activeTab, setActiveTab] = useState<Tab>('REGISTRATIONS')
  const [activeDivision, setActiveDivision] = useState<string>('')
  const [generatingDraw, setGeneratingDraw] = useState(false)
  const [scoreModal, setScoreModal] = useState<Match | null>(null)
  const [scoreInput, setScoreInput] = useState('')
  const [scoreWinner, setScoreWinner] = useState<'p1' | 'p2' | null>(null)
  const [savingScore, setSavingScore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: t } = await supabase
      .from('tournaments')
      .select(`id, name, status, draw_type, td_id, tournament_details(start_date, end_date, singles_fee, max_players, registration_deadline, courts_available, match_duration_minutes, min_rest_minutes, has_singles_draw, has_doubles_draw, clubs(name, address, city))`)
      .eq('id', id)
      .single()

    if (!t || t.td_id !== user.id) { router.push('/td'); return }
    setTournament(t as unknown as Tournament)

    const { data: regs } = await supabase
      .from('registrations')
      .select('id, user_id, first_name, last_name, usr_rating, division, draw_segment, payment_status, registered_at')
      .eq('tournament_id', id)
      .order('division', { ascending: true })
      .order('usr_rating', { ascending: false })

    const regList = (regs ?? []) as Registration[]

    if (regList.length > 0) {
      const userIds = regList.map(r => r.user_id)
      const { data: players } = await supabase
        .from('players')
        .select('user_id, club_name')
        .in('user_id', userIds)

      const clubMap: Record<string, string> = {}
      for (const p of (players ?? [])) clubMap[p.user_id] = p.club_name ?? ''
      setRegistrations(regList.map(r => ({ ...r, club_name: clubMap[r.user_id] ?? '' })))
    } else {
      setRegistrations([])
    }

    const { data: m } = await supabase
      .from('matches')
      .select('id, round_number, draw_segment, division, player1_id, player2_id, winner_id, score, match_index, next_match_id')
      .eq('tournament_id', id)
      .order('round_number', { ascending: true })
      .order('match_index', { ascending: true })

    setMatches((m ?? []) as Match[])

    const pm: PlayerMap = {}
    for (const r of regList) pm[r.user_id] = `${r.first_name} ${r.last_name}`.trim()
    setPlayerMap(pm)

    setLoading(false)
  }, [id, router])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    const divs = divisions()
    if (divs.length > 0 && !activeDivision) setActiveDivision(divs[0])
  })

  function divisions(): string[] {
    const from_regs = [...new Set(registrations.map(r => r.division).filter(Boolean))] as string[]
    const from_matches = [...new Set(matches.map(m => m.division).filter(Boolean))] as string[]
    return [...new Set([...from_regs, ...from_matches])].sort()
  }

  function playerName(uid: string | null): string {
    if (!uid) return 'BYE'
    return playerMap[uid] || uid.slice(0, 8) + '...'
  }

  async function setStatus(status: string) {
    const supabase = createClient()
    await supabase.from('tournaments').update({ status }).eq('id', id)
    setTournament(prev => prev ? { ...prev, status } : prev)
  }

  async function generateDraw(forceReset: boolean) {
    if (!tournament) return
    setGeneratingDraw(true)
    setError(null)
    const supabase = createClient()
    const { error: rpcErr } = await supabase.rpc('generate_tournament_draw', {
      t_id: tournament.id,
      format: tournament.draw_type,
      force_reset: forceReset,
    })
    if (rpcErr) { setError(rpcErr.message); setGeneratingDraw(false); return }
    await fetchAll()
    setGeneratingDraw(false)
  }

  async function saveScore() {
    if (!scoreModal || !scoreWinner) return
    setSavingScore(true)
    const winner_id = scoreWinner === 'p1' ? scoreModal.player1_id : scoreModal.player2_id
    const supabase = createClient()
    const { error: err } = await supabase
      .from('matches')
      .update({ winner_id, score: scoreInput.trim() || null })
      .eq('id', scoreModal.id)
    if (err) { setError(err.message); setSavingScore(false); return }
    setScoreModal(null)
    setScoreInput('')
    setScoreWinner(null)
    setSavingScore(false)
    await fetchAll()
  }

  async function deleteTournament() {
    if (!confirm(`Delete "${tournament?.name}"? This cannot be undone.`)) return
    const supabase = createClient()
    await supabase.from('tournaments').delete().eq('id', id)
    router.push('/td')
  }

  async function cyclePaymentStatus(regId: string, currentStatus: string) {
    const nextStatus = PAY_CYCLE[currentStatus] ?? 'deposit_paid'
    const supabase = createClient()
    const { error: err } = await supabase
      .from('registrations')
      .update({ payment_status: nextStatus })
      .eq('id', regId)
    if (!err) {
      setRegistrations(prev => prev.map(r => r.id === regId ? { ...r, payment_status: nextStatus } : r))
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--sl-bg)] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--sl-accent)] border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  if (!tournament) return null

  const detail = Array.isArray(tournament.tournament_details)
    ? tournament.tournament_details[0]
    : tournament.tournament_details

  const divs = divisions()
  const divMatches = matches.filter(m => m.division === activeDivision)
  const mainMatches = divMatches.filter(m => m.draw_segment === 'main')
  const plateMatches = divMatches.filter(m => m.draw_segment === 'plate')
  const maxRound = mainMatches.length > 0 ? Math.max(...mainMatches.map(m => m.round_number)) : 0

  return (
    <main className="min-h-screen bg-[var(--sl-bg)] text-[var(--sl-text)]">
      {/* Header */}
      <header className="border-b border-[var(--sl-border)] px-6 py-4 flex items-center justify-between">
        <Link href="/td"><SiteLogo /></Link>
        <ThemeToggle />
      </header>

      {/* Tournament header */}
      <div className="px-6 pt-8 pb-0 max-w-5xl mx-auto">
        <Link href="/td" className="text-xs text-[var(--sl-text-30)] hover:text-[var(--sl-accent)] transition">← MY TOURNAMENTS</Link>
        <div className="flex items-start gap-4 mt-3 mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-wider truncate">{tournament.name} Dashboard</h1>
            {detail && (
              <p className="text-[var(--sl-text-40)] text-xs mt-1">
                {detail.start_date
                  ? new Date(detail.start_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'Date TBD'}
                {detail.clubs ? ` · ${detail.clubs.name}` : ''}
                {detail.courts_available ? ` · ${detail.courts_available} courts` : ''}
              </p>
            )}
          </div>
          <span className={`shrink-0 text-[10px] font-bold tracking-widest px-3 py-1.5 rounded border ${STATUS_COLORS[tournament.status] ?? STATUS_COLORS.setup_pending}`}>
            {STATUS_LABELS[tournament.status] ?? tournament.status.toUpperCase()}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[var(--sl-border)]">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-[11px] font-bold tracking-widest transition border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-[var(--sl-accent)] text-[var(--sl-accent)]'
                  : 'border-transparent text-[var(--sl-text-40)] hover:text-[var(--sl-text-60)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-6 py-8 max-w-5xl mx-auto">
        {error && (
          <div className="mb-6 text-sm text-red-400 border border-red-500/20 bg-red-500/5 rounded-xl px-4 py-3">
            {error}
            <button onClick={() => setError(null)} className="ml-3 text-red-300 hover:text-red-200">✕</button>
          </div>
        )}

        {/* ── REGISTRATIONS ─────────────────────────────────────────────────── */}
        {activeTab === 'REGISTRATIONS' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-[var(--sl-text-40)] text-sm">
                {registrations.length} registered
                {detail?.max_players ? ` / ${detail.max_players} max` : ''}
              </p>
              <div className="flex gap-3">
                {tournament.status === 'setup_pending' && (
                  <button
                    onClick={() => setStatus('registration_open')}
                    className="text-xs font-bold tracking-widest text-[var(--sl-btn-text)] bg-[var(--sl-accent)] px-4 py-2 rounded-xl hover:bg-[var(--sl-accent-hover)] transition"
                  >
                    OPEN REGISTRATION
                  </button>
                )}
                {tournament.status === 'registration_open' && (
                  <button
                    onClick={() => setStatus('active')}
                    className="text-xs font-bold tracking-widest text-[var(--sl-text-40)] border border-[var(--sl-border)] px-4 py-2 rounded-xl hover:border-[var(--sl-text-20)] transition"
                  >
                    CLOSE REGISTRATION
                  </button>
                )}
              </div>
            </div>

            {registrations.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-[var(--sl-border)] rounded-2xl">
                <p className="text-[var(--sl-text-30)] text-sm mb-2">No registrations yet.</p>
                {tournament.status === 'setup_pending' && (
                  <p className="text-[var(--sl-text-20)] text-xs">Open registration so players can sign up.</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[var(--sl-border)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--sl-border)] bg-[var(--sl-surface)]">
                      {['NAME', 'DIVISION', 'USR', 'CLUB', 'PAYMENT', 'DATE'].map(h => (
                        <th key={h} className="text-left text-[10px] font-bold tracking-widest text-[var(--sl-text-40)] px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map((r, i) => (
                      <tr key={r.id} className={`border-b border-[var(--sl-border)] last:border-0 ${i % 2 === 0 ? '' : 'bg-[var(--sl-surface)]'}`}>
                        <td className="px-4 py-3 font-medium">{r.first_name} {r.last_name}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold tracking-widest text-[var(--sl-accent)]">{r.division ?? '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-[var(--sl-text-60)]">{r.usr_rating ?? '—'}</td>
                        <td className="px-4 py-3 text-[var(--sl-text-60)] text-xs">{r.club_name || '—'}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => cyclePaymentStatus(r.id, r.payment_status)}
                            title={`${r.payment_status} — click to change`}
                            className="flex items-center gap-1.5 hover:opacity-80 transition"
                          >
                            <span className="w-2.5 h-2.5 rounded-full shrink-0 inline-block" style={{ backgroundColor: dotColor(r.payment_status) }} />
                            <span className={`text-[10px] font-bold tracking-widest ${PAY_COLORS[r.payment_status] ?? 'text-[var(--sl-text-40)]'}`}>
                              {r.payment_status.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-[var(--sl-text-30)] text-xs">
                          {r.registered_at ? new Date(r.registered_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── DRAW ──────────────────────────────────────────────────────────── */}
        {activeTab === 'DRAW' && (
          <div>
            {divs.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {divs.map(d => (
                  <button
                    key={d}
                    onClick={() => setActiveDivision(d)}
                    className={`text-xs font-bold tracking-widest px-4 py-2 rounded-xl border transition ${
                      activeDivision === d
                        ? 'border-[var(--sl-accent)] bg-[var(--sl-accent-10)] text-[var(--sl-accent)]'
                        : 'border-[var(--sl-border)] text-[var(--sl-text-40)] hover:border-[var(--sl-text-20)]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-3 mb-8">
              <button
                onClick={() => generateDraw(false)}
                disabled={generatingDraw || matches.length > 0}
                className="text-xs font-bold tracking-widest text-[var(--sl-btn-text)] bg-[var(--sl-accent)] px-4 py-2.5 rounded-xl hover:bg-[var(--sl-accent-hover)] disabled:opacity-40 transition"
              >
                {generatingDraw ? 'GENERATING...' : 'GENERATE DRAW'}
              </button>
              {matches.length > 0 && (
                <button
                  onClick={() => { if (confirm('Regenerate draw? Existing scores will be lost.')) generateDraw(true) }}
                  disabled={generatingDraw}
                  className="text-xs font-bold tracking-widest text-[var(--sl-text-40)] border border-[var(--sl-border)] px-4 py-2.5 rounded-xl hover:border-[var(--sl-text-20)] disabled:opacity-40 transition"
                >
                  REGENERATE (RESET)
                </button>
              )}
            </div>

            {divs.length === 0 && (
              <p className="text-[var(--sl-text-30)] text-sm py-10 text-center">
                No divisions yet. Players need to register first.
              </p>
            )}

            {mainMatches.length > 0 && (
              <div>
                <h3 className="text-xs font-bold tracking-widest text-[var(--sl-text-40)] mb-4">MAIN DRAW — {activeDivision}</h3>
                <div className="overflow-x-auto">
                  <BracketView matches={mainMatches} maxRound={maxRound} playerName={playerName} />
                </div>
              </div>
            )}

            {plateMatches.length > 0 && (
              <div className="mt-10">
                <h3 className="text-xs font-bold tracking-widest text-[var(--sl-text-40)] mb-4">PLATE DRAW — {activeDivision}</h3>
                <div className="overflow-x-auto">
                  <BracketView
                    matches={plateMatches}
                    maxRound={Math.max(...plateMatches.map(m => m.round_number))}
                    playerName={playerName}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SCORE ENTRY ───────────────────────────────────────────────────── */}
        {activeTab === 'SCORE ENTRY' && (
          <div>
            {divs.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {divs.map(d => (
                  <button
                    key={d}
                    onClick={() => setActiveDivision(d)}
                    className={`text-xs font-bold tracking-widest px-4 py-2 rounded-xl border transition ${
                      activeDivision === d
                        ? 'border-[var(--sl-accent)] bg-[var(--sl-accent-10)] text-[var(--sl-accent)]'
                        : 'border-[var(--sl-border)] text-[var(--sl-text-40)] hover:border-[var(--sl-text-20)]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}

            {divMatches.length === 0 ? (
              <p className="text-[var(--sl-text-30)] text-sm py-10 text-center">No matches yet. Generate the draw first.</p>
            ) : (
              <div className="space-y-2">
                {divMatches
                  .filter(m => m.player1_id && m.player2_id)
                  .sort((a, b) => a.round_number - b.round_number || a.match_index - b.match_index)
                  .map(m => {
                    const isComplete = !!m.winner_id
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          if (isComplete) return
                          setScoreModal(m)
                          setScoreInput(m.score ?? '')
                          setScoreWinner(null)
                        }}
                        disabled={isComplete}
                        className={`w-full text-left bg-[var(--sl-surface)] border rounded-2xl p-4 transition ${
                          isComplete
                            ? 'border-[var(--sl-border)] opacity-60 cursor-default'
                            : 'border-[var(--sl-border)] hover:border-[var(--sl-accent-30)] cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-bold tracking-widest text-[var(--sl-text-30)] mr-3">
                              RD {m.round_number} · {m.draw_segment.toUpperCase()}
                            </span>
                            <span className={`font-medium text-sm ${m.winner_id === m.player1_id ? 'text-[var(--sl-accent)]' : 'text-[var(--sl-text)]'}`}>
                              {playerName(m.player1_id)}
                            </span>
                            <span className="text-[var(--sl-text-30)] mx-2">vs</span>
                            <span className={`font-medium text-sm ${m.winner_id === m.player2_id ? 'text-[var(--sl-accent)]' : 'text-[var(--sl-text)]'}`}>
                              {playerName(m.player2_id)}
                            </span>
                          </div>
                          <div className="shrink-0 text-right">
                            {isComplete ? (
                              <span className="text-[10px] font-bold tracking-widest text-green-400">
                                {m.score ? m.score : 'COMPLETE'}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold tracking-widest text-[var(--sl-accent)]">ENTER SCORE →</span>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS ──────────────────────────────────────────────────────── */}
        {activeTab === 'SETTINGS' && (
          <SettingsTab tournament={tournament} detail={detail ?? null} onUpdate={fetchAll} onDelete={deleteTournament} />
        )}
      </div>

      {/* Score entry modal */}
      {scoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setScoreModal(null)}>
          <div
            className="bg-[var(--sl-bg)] border border-[var(--sl-border)] rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold tracking-widest mb-1">ENTER SCORE</h3>
            <p className="text-[var(--sl-text-40)] text-xs mb-5">Round {scoreModal.round_number} · {scoreModal.division} · {scoreModal.draw_segment}</p>

            <div className="mb-4">
              <label className="block text-[10px] font-bold tracking-widest text-[var(--sl-text-40)] uppercase mb-2">Score (optional)</label>
              <input
                className="w-full bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--sl-accent)] transition"
                placeholder="e.g. 11-8, 11-5, 11-9"
                value={scoreInput}
                onChange={e => setScoreInput(e.target.value)}
              />
            </div>

            <div className="mb-6">
              <label className="block text-[10px] font-bold tracking-widest text-[var(--sl-text-40)] uppercase mb-3">Winner *</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'p1' as const, label: playerName(scoreModal.player1_id) },
                  { key: 'p2' as const, label: playerName(scoreModal.player2_id) },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setScoreWinner(key)}
                    className={`py-3 px-3 rounded-xl text-sm font-semibold border transition text-center ${
                      scoreWinner === key
                        ? 'border-[var(--sl-accent)] bg-[var(--sl-accent-10)] text-[var(--sl-accent)]'
                        : 'border-[var(--sl-border)] text-[var(--sl-text-60)] hover:border-[var(--sl-text-20)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setScoreModal(null)}
                className="flex-1 text-xs font-bold tracking-widest text-[var(--sl-text-40)] border border-[var(--sl-border)] py-3 rounded-xl hover:border-[var(--sl-text-20)] transition"
              >
                CANCEL
              </button>
              <button
                onClick={saveScore}
                disabled={!scoreWinner || savingScore}
                className="flex-1 text-xs font-bold tracking-widest text-[var(--sl-btn-text)] bg-[var(--sl-accent)] py-3 rounded-xl hover:bg-[var(--sl-accent-hover)] disabled:opacity-40 transition"
              >
                {savingScore ? 'SAVING...' : 'SAVE RESULT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// ─── Bracket View ─────────────────────────────────────────────────────────────

function BracketView({
  matches, maxRound, playerName,
}: {
  matches: Match[]
  maxRound: number
  playerName: (id: string | null) => string
}) {
  const rounds: Match[][] = []
  for (let r = 1; r <= maxRound; r++) {
    rounds.push(matches.filter(m => m.round_number === r).sort((a, b) => a.match_index - b.match_index))
  }

  const labelForRound = (r: number) => {
    if (r === maxRound) return 'FINAL'
    if (r === maxRound - 1) return 'SF'
    if (r === maxRound - 2) return 'QF'
    return `R${r}`
  }

  return (
    <div className="flex gap-4 min-w-max pb-4">
      {rounds.map((roundMatches, ri) => {
        const roundNum = ri + 1
        return (
          <div key={roundNum} className="flex flex-col gap-3">
            <div className="text-[10px] font-bold tracking-widest text-[var(--sl-text-30)] text-center mb-1 px-2">
              {labelForRound(roundNum)}
            </div>
            <div className="flex flex-col justify-around" style={{ gap: `${Math.pow(2, ri) * 4}px` }}>
              {roundMatches.map(m => {
                const p1Won = m.winner_id === m.player1_id
                const p2Won = m.winner_id === m.player2_id
                const complete = !!m.winner_id
                return (
                  <div
                    key={m.id}
                    className={`w-44 bg-[var(--sl-surface)] border rounded-xl overflow-hidden ${
                      complete ? 'border-[var(--sl-accent-20)]' : 'border-[var(--sl-border)]'
                    }`}
                  >
                    <div className={`flex items-center justify-between px-3 py-2 border-b border-[var(--sl-border)] ${p1Won ? 'bg-[var(--sl-accent-05)]' : ''}`}>
                      <span className={`text-xs truncate max-w-[7rem] ${p1Won ? 'font-bold text-[var(--sl-accent)]' : 'text-[var(--sl-text-60)]'} ${!m.player1_id ? 'text-[var(--sl-text-20)] italic' : ''}`}>
                        {playerName(m.player1_id)}
                      </span>
                      {p1Won && <span className="text-[8px] text-[var(--sl-accent)] ml-1">✓</span>}
                    </div>
                    <div className={`flex items-center justify-between px-3 py-2 ${p2Won ? 'bg-[var(--sl-accent-05)]' : ''}`}>
                      <span className={`text-xs truncate max-w-[7rem] ${p2Won ? 'font-bold text-[var(--sl-accent)]' : 'text-[var(--sl-text-60)]'} ${!m.player2_id ? 'text-[var(--sl-text-20)] italic' : ''}`}>
                        {playerName(m.player2_id)}
                      </span>
                      {p2Won && <span className="text-[8px] text-[var(--sl-accent)] ml-1">✓</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({
  tournament, detail, onUpdate, onDelete,
}: {
  tournament: Tournament
  detail: TournamentDetail | null
  onUpdate: () => void
  onDelete: () => void
}) {
  const [name, setName] = useState(tournament.name)
  const [drawType, setDrawType] = useState(tournament.draw_type)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const DRAW_TYPES = ['Knockout + Plate', 'Round Robin → Knockout', 'Full Round Robin', 'Monrad']

  async function save() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('tournaments').update({ name, draw_type: drawType }).eq('id', tournament.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    onUpdate()
  }

  const inputClass = `w-full bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-xl px-4 py-3 text-sm text-[var(--sl-text)] focus:outline-none focus:border-[var(--sl-accent)] transition`
  const labelClass = `block text-[10px] font-bold tracking-widest text-[var(--sl-text-40)] uppercase mb-2`

  return (
    <div className="space-y-8 max-w-lg">
      <div className="bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-2xl p-6 space-y-5">
        <h2 className="text-xs font-bold tracking-widest text-[var(--sl-text-40)] uppercase">TOURNAMENT DETAILS</h2>

        <div>
          <label className={labelClass}>Tournament Name</label>
          <input className={inputClass} value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div>
          <label className={labelClass}>Draw Type</label>
          <select className={inputClass} value={drawType} onChange={e => setDrawType(e.target.value)}>
            {DRAW_TYPES.map(dt => <option key={dt} value={dt}>{dt}</option>)}
          </select>
        </div>

        {detail && (
          <div className="text-xs text-[var(--sl-text-40)] space-y-1 pt-2 border-t border-[var(--sl-border)]">
            {detail.start_date && <p>Start: {new Date(detail.start_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
            {detail.clubs && <p>Venue: {detail.clubs.name}{detail.clubs.city ? `, ${detail.clubs.city}` : ''}</p>}
            {detail.singles_fee != null && <p>Entry fee: ${Number(detail.singles_fee).toFixed(2)}</p>}
            {detail.courts_available && <p>Courts: {detail.courts_available}</p>}
            {detail.match_duration_minutes && <p>Match duration: {detail.match_duration_minutes} mins</p>}
            {detail.min_rest_minutes && <p>Min rest: {detail.min_rest_minutes} mins</p>}
          </div>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="w-full text-sm font-bold tracking-widest text-[var(--sl-btn-text)] bg-[var(--sl-accent)] py-3 rounded-xl hover:bg-[var(--sl-accent-hover)] disabled:opacity-50 transition"
        >
          {saved ? 'SAVED ✓' : saving ? 'SAVING...' : 'SAVE CHANGES'}
        </button>
      </div>

      <div className="bg-[var(--sl-surface)] border border-red-500/20 rounded-2xl p-6">
        <h2 className="text-xs font-bold tracking-widest text-red-400 uppercase mb-3">DANGER ZONE</h2>
        <p className="text-[var(--sl-text-40)] text-xs mb-4">Deleting a tournament permanently removes all registrations, draws, and match data.</p>
        <button
          onClick={onDelete}
          className="text-xs font-bold tracking-widest text-red-400 border border-red-500/30 px-4 py-2.5 rounded-xl hover:bg-red-500/10 transition"
        >
          DELETE TOURNAMENT
        </button>
      </div>
    </div>
  )
}
