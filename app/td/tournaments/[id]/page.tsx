'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type TournamentDetail = {
  start_date: string | null
  end_date: string | null
  daily_start_time: string | null
  daily_end_time: string | null
  courts_available: number | null
  match_duration_minutes: number | null
  warm_up_minutes: number | null
  min_rest_hours: number | null
  max_matches_per_day: number | null
  singles_entry_fee: number | null
  has_singles_draw: boolean | null
  has_doubles_draw: boolean | null
  max_players: number | null
  registration_opens: string | null
  registration_deadline: string | null
  td_email: string | null
  clubs: { name: string; city: string | null } | null
}

type Tournament = {
  id: string
  name: string
  status: string
  draw_type: string
  td_id: string
  tournament_details: TournamentDetail[]
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
  created_at: string
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

const TABS = ['REGISTRATIONS', 'DRAW', 'SCORE ENTRY', 'SETTINGS'] as const
type Tab = typeof TABS[number]

const STATUS_LABEL: Record<string, string> = {
  setup_pending: 'SETUP', registration_open: 'OPEN', active: 'ACTIVE', completed: 'COMPLETED',
}
const STATUS_COLOR: Record<string, string> = {
  setup_pending: 'bg-neutral-800 text-neutral-400 border-neutral-700',
  registration_open: 'bg-green-900/40 text-green-400 border-green-700/40',
  active: 'bg-red-900/40 text-red-400 border-red-700/40',
  completed: 'bg-neutral-800 text-neutral-500 border-neutral-700',
}
const PAY_COLOR: Record<string, string> = {
  fully_paid: 'text-green-400', deposit_paid: 'text-yellow-400',
  waitlist: 'text-neutral-500', pending: 'text-neutral-500', paid: 'text-green-400',
}
const PAY_DOT: Record<string, string> = {
  fully_paid: 'bg-green-500', deposit_paid: 'bg-yellow-500',
  waitlist: 'bg-red-500', pending: 'bg-neutral-500', paid: 'bg-green-500',
}
const PAY_CYCLE: Record<string, string> = {
  waitlist: 'deposit_paid', deposit_paid: 'fully_paid', fully_paid: 'waitlist',
  pending: 'deposit_paid', paid: 'fully_paid',
}

function dotColor(s: string) { return PAY_DOT[s] ?? 'bg-neutral-500' }

// ─── Capacity calc (same formula as wizard) ───────────────────────────────────

function calcCapacityFromDetail(d: TournamentDetail): number {
  const courts = d.courts_available ?? 0
  const matchMins = d.match_duration_minutes ?? 40
  const warmup = d.warm_up_minutes ?? 10
  const slotMins = matchMins + warmup
  const minRestMins = (d.min_rest_hours ?? 3) * 60
  const maxPerDay = d.max_matches_per_day ?? 2

  const toMins = (t: string | null) => {
    if (!t) return 0
    const [h, m] = t.split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
  }

  const start = toMins(d.daily_start_time)
  const end = toMins(d.daily_end_time)
  const dailyMins = Math.max(0, end - start)

  let days = 1
  if (d.start_date && d.end_date) {
    const ms = new Date(d.end_date).getTime() - new Date(d.start_date).getTime()
    days = Math.max(1, Math.round(ms / 86400000) + 1)
  }

  if (dailyMins <= 0 || courts <= 0 || slotMins <= 0) return 0
  const totalSlots = Math.floor(dailyMins / slotMins) * courts * days
  const maxByRest = Math.max(1, Math.floor((dailyMins - matchMins) / (matchMins + minRestMins)) + 1)
  const perDayCap = Math.min(maxPerDay, maxByRest)
  const playerMatchCap = perDayCap * days
  const raw = Math.floor((totalSlots * 2) / playerMatchCap)
  if (raw < 2) return 0
  return Math.pow(2, Math.floor(Math.log2(raw)))
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TournamentPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [playerMap, setPlayerMap] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<Tab>('REGISTRATIONS')
  const [activeDivision, setActiveDivision] = useState('')
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
      .select('id, name, status, draw_type, td_id, tournament_details(start_date, end_date, daily_start_time, daily_end_time, courts_available, match_duration_minutes, warm_up_minutes, min_rest_hours, max_matches_per_day, singles_entry_fee, has_singles_draw, has_doubles_draw, max_players, registration_opens, registration_deadline, td_email, clubs(name, city))')
      .eq('id', id)
      .single()

    if (!t || (t as unknown as Tournament).td_id !== user.id) { router.push('/td'); return }
    setTournament(t as unknown as Tournament)

    const { data: regs } = await supabase
      .from('registrations')
      .select('id, user_id, first_name, last_name, usr_rating, division, draw_segment, payment_status, created_at')
      .eq('tournament_id', id)
      .order('division', { ascending: true })
      .order('usr_rating', { ascending: false })

    const regList = (regs ?? []) as Registration[]

    if (regList.length > 0) {
      const { data: players } = await supabase
        .from('players')
        .select('user_id, club_name')
        .in('user_id', regList.map(r => r.user_id))
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
      .order('round_number')
      .order('match_index')

    setMatches((m ?? []) as Match[])

    const pm: Record<string, string> = {}
    for (const r of regList) pm[r.user_id] = `${r.first_name} ${r.last_name}`.trim()
    setPlayerMap(pm)
    setLoading(false)
  }, [id, router])

  useEffect(() => { fetchAll() }, [fetchAll])

  function divisions() {
    const s = new Set([
      ...registrations.map(r => r.division).filter(Boolean),
      ...matches.map(m => m.division).filter(Boolean),
    ])
    return [...s].sort() as string[]
  }

  const divs = divisions()

  useEffect(() => {
    if (divs.length > 0 && !activeDivision) setActiveDivision(divs[0])
  })

  function playerName(uid: string | null) {
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
    setScoreModal(null); setScoreInput(''); setScoreWinner(null); setSavingScore(false)
    await fetchAll()
  }

  async function cyclePayment(regId: string, current: string) {
    const next = PAY_CYCLE[current] ?? 'deposit_paid'
    const supabase = createClient()
    const { error: err } = await supabase.from('registrations').update({ payment_status: next }).eq('id', regId)
    if (!err) setRegistrations(prev => prev.map(r => r.id === regId ? { ...r, payment_status: next } : r))
  }

  async function deleteTournament() {
    const supabase = createClient()
    // Delete child records first to satisfy FK constraints
    await supabase.from('matches').delete().eq('tournament_id', id)
    await supabase.from('registrations').delete().eq('tournament_id', id)
    await supabase.from('tournament_details').delete().eq('tournament_id', id)
    const { error: delErr } = await supabase.from('tournaments').delete().eq('id', id)
    if (delErr) { setError(delErr.message); return }
    router.push('/td')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!tournament) return null

  const detail = Array.isArray(tournament.tournament_details)
    ? tournament.tournament_details[0]
    : tournament.tournament_details as unknown as TournamentDetail

  const capacity = detail ? calcCapacityFromDetail(detail) : 0
  const divMatches = matches.filter(m => m.division === activeDivision)
  const mainMatches = divMatches.filter(m => m.draw_segment === 'main')
  const plateMatches = divMatches.filter(m => m.draw_segment === 'plate')
  const maxRound = mainMatches.length > 0 ? Math.max(...mainMatches.map(m => m.round_number)) : 0

  // Div counts
  const divCounts: Record<string, number> = {}
  registrations.forEach(r => { if (r.division) divCounts[r.division] = (divCounts[r.division] || 0) + 1 })

  return (
    <div>
      {/* Tournament header */}
      <div className="border-b border-neutral-800 px-6 pt-8 pb-0 max-w-5xl mx-auto">
        <Link href="/td" className="text-xs text-neutral-600 hover:text-neutral-300 transition">← MY TOURNAMENTS</Link>
        <div className="flex items-start gap-4 mt-3 mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold tracking-wide truncate">{tournament.name}</h1>
            {detail && (
              <p className="text-neutral-500 text-xs mt-1">
                {detail.start_date ? new Date(detail.start_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date TBD'}
                {detail.clubs?.name ? ` · ${detail.clubs.name}` : ''}
                {detail.courts_available ? ` · ${detail.courts_available} courts` : ''}
              </p>
            )}
          </div>
          <span className={`shrink-0 text-[10px] font-bold tracking-widest px-3 py-1.5 rounded border ${STATUS_COLOR[tournament.status] ?? STATUS_COLOR.setup_pending}`}>
            {STATUS_LABEL[tournament.status] ?? tournament.status.toUpperCase()}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-[11px] font-bold tracking-widest transition border-b-2 -mb-px ${
                activeTab === tab ? 'border-red-600 text-red-500' : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-8 max-w-5xl mx-auto">
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-700/40 text-red-400 text-sm rounded-xl px-4 py-3 flex justify-between">
            {error}
            <button onClick={() => setError(null)} className="ml-3 text-red-600">✕</button>
          </div>
        )}

        {/* ── REGISTRATIONS ─────────────────────────────────────────────── */}
        {activeTab === 'REGISTRATIONS' && (
          <div>
            {/* Capacity panel */}
            {detail && capacity > 0 && (
              <div className="mb-6 bg-neutral-900 border border-neutral-800 rounded-2xl px-5 py-4">
                <p className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase mb-3">Court Capacity</p>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-neutral-400">
                  <span><span className="font-bold text-white">{detail.courts_available}</span> courts</span>
                  {detail.start_date && detail.end_date && (
                    <span><span className="font-bold text-white">
                      {Math.max(1, Math.round((new Date(detail.end_date).getTime() - new Date(detail.start_date).getTime()) / 86400000) + 1)}
                    </span> days</span>
                  )}
                  <span><span className="font-bold text-white">{detail.match_duration_minutes}</span>min matches</span>
                  <span className="text-neutral-700">→</span>
                  <span>comfortable max <span className="font-bold text-red-500">{capacity} players</span></span>
                </div>
                <div className="mt-2 text-xs text-neutral-600">
                  {registrations.length} registered · {Math.max(0, capacity - registrations.length)} spots remaining
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-6">
              <p className="text-neutral-500 text-sm">{registrations.length} registered</p>
              <div className="flex gap-3">
                {tournament.status === 'setup_pending' && (
                  <button onClick={() => setStatus('registration_open')}
                    className="bg-red-700 hover:bg-red-600 text-white text-xs font-bold tracking-widest px-4 py-2 rounded-xl transition">
                    OPEN REGISTRATION
                  </button>
                )}
                {tournament.status === 'registration_open' && (
                  <button onClick={() => setStatus('active')}
                    className="border border-neutral-700 text-neutral-400 text-xs font-bold tracking-widest px-4 py-2 rounded-xl hover:border-neutral-500 transition">
                    CLOSE REGISTRATION
                  </button>
                )}
                {tournament.status === 'active' && (
                  <button onClick={() => setStatus('completed')}
                    className="border border-neutral-700 text-neutral-400 text-xs font-bold tracking-widest px-4 py-2 rounded-xl hover:border-neutral-500 transition">
                    MARK COMPLETED
                  </button>
                )}
              </div>
            </div>

            {/* Division summary */}
            {divs.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {divs.map(d => (
                  <div key={d} className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs">
                    <span className="font-bold text-red-500">{d}</span>
                    <span className="text-neutral-500 ml-2">{divCounts[d] ?? 0} players</span>
                  </div>
                ))}
              </div>
            )}

            {registrations.length === 0 ? (
              <div className="border border-dashed border-neutral-800 rounded-2xl py-16 text-center">
                <p className="text-neutral-500 text-sm">No registrations yet.</p>
                {tournament.status === 'setup_pending' && (
                  <p className="text-neutral-700 text-xs mt-2">Open registration so players can sign up.</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-neutral-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-neutral-900">
                      {['NAME', 'DIV', 'USR', 'CLUB', 'PAYMENT', 'DATE'].map(h => (
                        <th key={h} className="text-left text-[10px] font-bold tracking-widest text-neutral-500 px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map((r, i) => (
                      <tr key={r.id} className={`border-b border-neutral-800 last:border-0 ${i % 2 === 0 ? '' : 'bg-neutral-900/50'}`}>
                        <td className="px-4 py-3 font-medium text-neutral-100">{r.first_name} {r.last_name}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold tracking-widest text-red-500">{r.division ?? '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-neutral-400">{r.usr_rating ?? '—'}</td>
                        <td className="px-4 py-3 text-neutral-500 text-xs">{r.club_name || '—'}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => cyclePayment(r.id, r.payment_status)}
                            className="flex items-center gap-1.5 hover:opacity-70 transition">
                            <span className={`w-2 h-2 rounded-full ${dotColor(r.payment_status)}`} />
                            <span className={`text-[10px] font-bold tracking-widest ${PAY_COLOR[r.payment_status] ?? 'text-neutral-500'}`}>
                              {r.payment_status.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-neutral-600 text-xs">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── DRAW ──────────────────────────────────────────────────────── */}
        {activeTab === 'DRAW' && (
          <div>
            {divs.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {divs.map(d => (
                  <button key={d} onClick={() => setActiveDivision(d)}
                    className={`text-xs font-bold tracking-widest px-4 py-2 rounded-xl border transition ${
                      activeDivision === d ? 'bg-red-700 border-red-700 text-white' : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-3 mb-8">
              <button onClick={() => generateDraw(false)} disabled={generatingDraw || matches.length > 0}
                className="bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white text-xs font-bold tracking-widest px-4 py-2.5 rounded-xl transition">
                {generatingDraw ? 'GENERATING...' : 'GENERATE DRAW'}
              </button>
              {matches.length > 0 && (
                <button onClick={() => { if (confirm('Regenerate? Existing scores will be lost.')) generateDraw(true) }}
                  disabled={generatingDraw}
                  className="border border-neutral-700 text-neutral-400 text-xs font-bold tracking-widest px-4 py-2.5 rounded-xl hover:border-neutral-500 disabled:opacity-40 transition">
                  REGENERATE (RESET)
                </button>
              )}
            </div>
            {divs.length === 0 && (
              <p className="text-neutral-500 text-sm py-10 text-center">No divisions yet. Players need to register first.</p>
            )}
            {mainMatches.length > 0 && (
              <div className="mb-10">
                <p className="text-[10px] font-bold tracking-widest text-neutral-500 mb-4">MAIN DRAW — {activeDivision}</p>
                <div className="overflow-x-auto">
                  <BracketView matches={mainMatches} maxRound={maxRound} playerName={playerName} />
                </div>
              </div>
            )}
            {plateMatches.length > 0 && (
              <div>
                <p className="text-[10px] font-bold tracking-widest text-neutral-500 mb-4">PLATE DRAW — {activeDivision}</p>
                <div className="overflow-x-auto">
                  <BracketView matches={plateMatches} maxRound={Math.max(...plateMatches.map(m => m.round_number))} playerName={playerName} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SCORE ENTRY ───────────────────────────────────────────────── */}
        {activeTab === 'SCORE ENTRY' && (
          <div>
            {divs.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {divs.map(d => (
                  <button key={d} onClick={() => setActiveDivision(d)}
                    className={`text-xs font-bold tracking-widest px-4 py-2 rounded-xl border transition ${
                      activeDivision === d ? 'bg-red-700 border-red-700 text-white' : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
            )}
            {divMatches.length === 0 ? (
              <p className="text-neutral-500 text-sm py-10 text-center">No matches yet. Generate the draw first.</p>
            ) : (
              <div className="space-y-2">
                {divMatches
                  .filter(m => m.player1_id && m.player2_id)
                  .sort((a, b) => a.round_number - b.round_number || a.match_index - b.match_index)
                  .map(m => {
                    const done = !!m.winner_id
                    return (
                      <button key={m.id} disabled={done}
                        onClick={() => { if (done) return; setScoreModal(m); setScoreInput(m.score ?? ''); setScoreWinner(null) }}
                        className={`w-full text-left bg-neutral-900 border rounded-2xl p-4 transition ${
                          done ? 'border-neutral-800 opacity-60 cursor-default' : 'border-neutral-800 hover:border-red-700/50 cursor-pointer'
                        }`}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0 text-sm">
                            <span className="text-[10px] font-bold tracking-widest text-neutral-600 mr-3">RD {m.round_number} · {m.draw_segment.toUpperCase()}</span>
                            <span className={`font-medium ${m.winner_id === m.player1_id ? 'text-red-500' : 'text-neutral-200'}`}>{playerName(m.player1_id)}</span>
                            <span className="text-neutral-600 mx-2">vs</span>
                            <span className={`font-medium ${m.winner_id === m.player2_id ? 'text-red-500' : 'text-neutral-200'}`}>{playerName(m.player2_id)}</span>
                          </div>
                          <div className="shrink-0">
                            {done
                              ? <span className="text-[10px] font-bold tracking-widest text-green-400">{m.score || 'COMPLETE'}</span>
                              : <span className="text-[10px] font-bold tracking-widest text-red-500">ENTER →</span>
                            }
                          </div>
                        </div>
                      </button>
                    )
                  })}
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS ──────────────────────────────────────────────────── */}
        {activeTab === 'SETTINGS' && (
          <SettingsTab tournament={tournament} detail={detail ?? null} onUpdate={fetchAll} onDelete={deleteTournament} />
        )}
      </div>

      {/* Score modal */}
      {scoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setScoreModal(null)}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold tracking-widest mb-1">ENTER SCORE</h3>
            <p className="text-neutral-500 text-xs mb-5">Round {scoreModal.round_number} · {scoreModal.division} · {scoreModal.draw_segment}</p>
            <div className="mb-4">
              <label className="block text-[10px] font-bold tracking-widest text-neutral-500 uppercase mb-2">Score (optional)</label>
              <input className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-neutral-100 focus:outline-none focus:border-red-600 transition"
                placeholder="e.g. 11-8, 11-5, 11-9" value={scoreInput} onChange={e => setScoreInput(e.target.value)} />
            </div>
            <div className="mb-6">
              <label className="block text-[10px] font-bold tracking-widest text-neutral-500 uppercase mb-3">Winner *</label>
              <div className="grid grid-cols-2 gap-3">
                {(['p1', 'p2'] as const).map(key => (
                  <button key={key} onClick={() => setScoreWinner(key)}
                    className={`py-3 px-3 rounded-xl text-sm font-semibold border transition text-center ${
                      scoreWinner === key ? 'border-red-600 bg-red-900/30 text-red-400' : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
                    }`}>
                    {playerName(key === 'p1' ? scoreModal.player1_id : scoreModal.player2_id)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setScoreModal(null)}
                className="flex-1 text-xs font-bold tracking-widest text-neutral-400 border border-neutral-700 py-3 rounded-xl hover:border-neutral-500 transition">
                CANCEL
              </button>
              <button onClick={saveScore} disabled={!scoreWinner || savingScore}
                className="flex-1 text-xs font-bold tracking-widest bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white py-3 rounded-xl transition">
                {savingScore ? 'SAVING...' : 'SAVE RESULT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Bracket View ─────────────────────────────────────────────────────────────

function BracketView({ matches, maxRound, playerName }: {
  matches: Match[]
  maxRound: number
  playerName: (id: string | null) => string
}) {
  const rounds: Match[][] = []
  for (let r = 1; r <= maxRound; r++) {
    rounds.push(matches.filter(m => m.round_number === r).sort((a, b) => a.match_index - b.match_index))
  }
  const label = (r: number) => r === maxRound ? 'FINAL' : r === maxRound - 1 ? 'SEMI' : r === maxRound - 2 ? 'QF' : `R${r}`

  return (
    <div className="flex gap-4 min-w-max pb-4">
      {rounds.map((roundMatches, ri) => {
        const rn = ri + 1
        return (
          <div key={rn} className="flex flex-col">
            <div className="text-[10px] font-bold tracking-widest text-neutral-600 text-center mb-2 px-2">{label(rn)}</div>
            <div className="flex flex-col justify-around" style={{ gap: `${Math.pow(2, ri) * 4}px` }}>
              {roundMatches.map(m => {
                const p1w = m.winner_id === m.player1_id
                const p2w = m.winner_id === m.player2_id
                return (
                  <div key={m.id} className={`w-44 bg-neutral-900 border rounded-xl overflow-hidden ${m.winner_id ? 'border-red-900/50' : 'border-neutral-800'}`}>
                    <div className={`flex items-center justify-between px-3 py-2 border-b border-neutral-800 ${p1w ? 'bg-red-900/20' : ''}`}>
                      <span className={`text-xs truncate max-w-[7rem] ${p1w ? 'font-bold text-red-400' : !m.player1_id ? 'italic text-neutral-700' : 'text-neutral-400'}`}>
                        {playerName(m.player1_id)}
                      </span>
                      {p1w && <span className="text-[8px] text-red-500 ml-1">✓</span>}
                    </div>
                    <div className={`flex items-center justify-between px-3 py-2 ${p2w ? 'bg-red-900/20' : ''}`}>
                      <span className={`text-xs truncate max-w-[7rem] ${p2w ? 'font-bold text-red-400' : !m.player2_id ? 'italic text-neutral-700' : 'text-neutral-400'}`}>
                        {playerName(m.player2_id)}
                      </span>
                      {p2w && <span className="text-[8px] text-red-500 ml-1">✓</span>}
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

function SettingsTab({ tournament, detail, onUpdate, onDelete }: {
  tournament: Tournament
  detail: TournamentDetail | null
  onUpdate: () => void
  onDelete: () => void
}) {
  const [name, setName] = useState(tournament.name)
  const [drawType, setDrawType] = useState(tournament.draw_type)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const DRAW_TYPES = ['Knockout + Plate', 'Round Robin → Knockout', 'Full Round Robin', 'Monrad']
  const inputCls = 'w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-base text-neutral-100 focus:outline-none focus:border-red-600 transition'
  const labelCls = 'block text-sm font-bold tracking-wide text-neutral-400 mb-2'

  async function save() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('tournaments').update({ name, draw_type: drawType }).eq('id', tournament.id)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    onUpdate()
  }

  return (
    <div className="space-y-8 max-w-lg">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
        <h2 className="text-base font-bold tracking-wide text-neutral-300 uppercase">Tournament Details</h2>
        <div>
          <label className={labelCls}>Tournament Name</label>
          <input className={inputCls} value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Draw Format</label>
          <select className={inputCls} value={drawType} onChange={e => setDrawType(e.target.value)}>
            {DRAW_TYPES.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        {detail && (
          <div className="text-sm text-neutral-500 space-y-2 pt-3 border-t border-neutral-800">
            {detail.start_date && (
              <p><span className="text-neutral-400 font-medium">Start:</span> {new Date(detail.start_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            )}
            {detail.clubs && (
              <p><span className="text-neutral-400 font-medium">Venue:</span> {detail.clubs.name}{detail.clubs.city ? `, ${detail.clubs.city}` : ''}</p>
            )}
            {detail.singles_entry_fee != null && (
              <p><span className="text-neutral-400 font-medium">Singles fee:</span> ${Number(detail.singles_entry_fee).toFixed(2)}</p>
            )}
            {detail.td_email && (
              <p><span className="text-neutral-400 font-medium">TD email:</span> {detail.td_email}</p>
            )}
          </div>
        )}
        <button onClick={save} disabled={saving}
          className="w-full bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-base font-bold tracking-wide py-3 rounded-xl transition">
          {saved ? 'SAVED ✓' : saving ? 'SAVING...' : 'SAVE CHANGES'}
        </button>
      </div>

      <div className="bg-neutral-900 border border-red-900/30 rounded-2xl p-6">
        <h2 className="text-base font-bold tracking-wide text-red-500 uppercase mb-2">Danger Zone</h2>
        <p className="text-sm text-neutral-500 mb-5">Permanently deletes all registrations, matches, and draw data. This cannot be undone.</p>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            className="text-sm font-bold tracking-wide text-red-500 border border-red-900/50 px-5 py-3 rounded-xl hover:bg-red-900/20 transition">
            DELETE TOURNAMENT
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-bold text-red-400">Delete &ldquo;{tournament.name}&rdquo;? All data will be lost.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 text-sm font-bold border border-neutral-700 text-neutral-400 py-3 rounded-xl hover:border-neutral-500 transition">
                CANCEL
              </button>
              <button onClick={onDelete}
                className="flex-1 text-sm font-bold bg-red-700 hover:bg-red-600 text-white py-3 rounded-xl transition">
                YES, DELETE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
