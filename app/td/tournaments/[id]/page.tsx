'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { reconstructDaySchedules } from '@/lib/td/flutterParity'
import { generateBracketAndSchedule } from '@/lib/td/drawGenerator'

// ─── Types ────────────────────────────────────────────────────────────────────

type TournamentDetail = {
  start_date: string | null
  end_date: string | null
  daily_start_time: string | null
  daily_end_time: string | null
  morning_start: string | null
  lunch_start: string | null
  lunch_duration_mins: number | null
  afternoon_start: string | null
  has_dinner_break: boolean | null
  dinner_start: string | null
  dinner_duration_mins: number | null
  has_evening_session: boolean | null
  evening_start: string | null
  courts_available: number | null
  match_duration_minutes: number | null
  warm_up_minutes: number | null
  min_rest_hours: number | null
  max_matches_per_day: number | null
  forfeit_minutes: number | null
  singles_entry_fee: number | null
  doubles_entry_fee: number | null
  has_singles_draw: boolean | null
  has_doubles_draw: boolean | null
  registration_opens: string | null
  registration_deadline: string | null
  has_waitlist: boolean | null
  waitlist_spots: number | null
  multi_division_allow_multiple: boolean | null
  referee_required: boolean | null
  has_trophy: boolean | null
  prize_purse: number | null
  has_player_gift: boolean | null
  player_gift_desc: string | null
  sponsor_name: string | null
  has_social_event: boolean | null
  social_event_time: string | null
  social_event_desc: string | null
  tournament_notes: string | null
  td_email: string | null
  td_phone_comm: string | null
  auto_notify_draw: boolean | null
  auto_reminder_match: boolean | null
  reminder_hours: number | null
  welcome_message: string | null
  check_in_required: boolean | null
  check_in_open_mins: number | null
  live_scoring: boolean | null
  score_verification: boolean | null
  print_score_sheets: boolean | null
  court_assignment_display: string | null
  max_players: number | null
  schedule_slots: string | null  // JSON string for 009 persistence
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
  scheduled_time: string | null
  court_id: string | null
}

const TABS = ['OVERVIEW', 'BRACKET', 'SCHEDULE', 'PLAYERS', 'SETUP'] as const
type Tab = typeof TABS[number]

const STATUS_LABEL: Record<string, string> = {
  setup_pending: 'SETUP', registration_open: 'OPEN', active: 'ACTIVE', completed: 'COMPLETED',
}
const STATUS_COLOR: Record<string, string> = {
  setup_pending: 'bg-[var(--sl-surface)] text-[var(--sl-text-50)] border-[var(--sl-border)]',
  registration_open: 'bg-green-900/40 text-green-400 border-green-700/40',
  active: 'bg-[var(--sl-accent-10)] text-[var(--sl-accent)] border-[var(--sl-accent-30)]',
  completed: 'bg-[var(--sl-surface)] text-[var(--sl-text-30)] border-[var(--sl-border)]',
}
const PAY_COLOR: Record<string, string> = {
  fully_paid: 'text-green-400', deposit_paid: 'text-yellow-400',
  waitlist: 'text-[var(--sl-text-50)]', pending: 'text-[var(--sl-text-50)]', paid: 'text-green-400',
}
const PAY_DOT: Record<string, string> = {
  fully_paid: 'bg-green-500', deposit_paid: 'bg-yellow-500',
  waitlist: 'bg-red-500', pending: 'bg-[var(--sl-text-30)]', paid: 'bg-green-500',
}
const PAY_CYCLE: Record<string, string> = {
  waitlist: 'deposit_paid', deposit_paid: 'fully_paid', fully_paid: 'waitlist',
  pending: 'deposit_paid', paid: 'fully_paid',
}

function dotColor(s: string) { return PAY_DOT[s] ?? 'bg-[var(--sl-text-30)]' }

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
  const searchParams = useSearchParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [playerMap, setPlayerMap] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW')
  const [activeDivision, setActiveDivision] = useState('')
  const [generatingDraw, setGeneratingDraw] = useState(false)
  const [scoreModal, setScoreModal] = useState<Match | null>(null)
  const [scoreInput, setScoreInput] = useState('')
  const [scoreWinner, setScoreWinner] = useState<'p1' | 'p2' | null>(null)
  const [savingScore, setSavingScore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showCreatedBanner, setShowCreatedBanner] = useState(false)
  const [showUpdatedBanner, setShowUpdatedBanner] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [activeDraw, setActiveDraw] = useState<'main' | 'plate'>('main')
  const [playerDivFilter, setPlayerDivFilter] = useState('')


  const fetchAll = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)

    const { data: t } = await supabase
      .from('tournaments')
      .select('id, name, status, draw_type, td_id, tournament_details(start_date, end_date, daily_start_time, daily_end_time, morning_start, lunch_start, lunch_duration_mins, afternoon_start, has_dinner_break, dinner_start, dinner_duration_mins, has_evening_session, evening_start, courts_available, match_duration_minutes, warm_up_minutes, min_rest_hours, max_matches_per_day, forfeit_minutes, singles_entry_fee, doubles_entry_fee, has_singles_draw, has_doubles_draw, registration_opens, registration_deadline, has_waitlist, waitlist_spots, multi_division_allow_multiple, referee_required, has_trophy, prize_purse, has_player_gift, player_gift_desc, sponsor_name, has_social_event, social_event_time, social_event_desc, tournament_notes, td_email, td_phone_comm, auto_notify_draw, auto_reminder_match, reminder_hours, welcome_message, check_in_required, check_in_open_mins, live_scoring, score_verification, print_score_sheets, court_assignment_display, max_players, schedule_slots, clubs(name, city))')
      .eq('id', id)
      .single()

    if (!t || (t as unknown as Tournament).td_id !== user.id) {
      console.warn('Tournament not found or not owned by current user', { id, t })
      router.push('/td')
      return
    }
    setTournament(t as unknown as Tournament)

    const { data: regs } = await supabase
      .from('registrations')
      .select('id, user_id, first_name, last_name, usr_rating, division, draw_segment, payment_status, created_at')
      .eq('tournament_id', id)
      .order('division', { ascending: true })
      .order('usr_rating', { ascending: false })

    const regList = (regs ?? []) as Registration[]

    if (regList.length > 0) {
      const userIds = regList.map(r => r.user_id)

      const [{ data: profileRows }, { data: players }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, first_name, last_name, usr_rating')
          .in('id', userIds),
        supabase
          .from('players')
          .select('user_id, club_name')
          .in('user_id', userIds),
      ])

      const profileMap: Record<string, { first_name: string; last_name: string; usr_rating: number | null }> = {}
      for (const p of (profileRows ?? [])) {
        profileMap[p.id] = { first_name: p.first_name ?? '', last_name: p.last_name ?? '', usr_rating: p.usr_rating ?? null }
      }

      const clubMap: Record<string, string> = {}
      for (const p of (players ?? [])) clubMap[p.user_id] = p.club_name ?? ''

      setRegistrations(regList.map(r => ({
        ...r,
        first_name: profileMap[r.user_id]?.first_name || r.first_name,
        last_name:  profileMap[r.user_id]?.last_name  || r.last_name,
        usr_rating: profileMap[r.user_id]?.usr_rating ?? r.usr_rating,
        club_name:  clubMap[r.user_id] ?? '',
      })))
    } else {
      setRegistrations([])
    }

    const { data: m } = await supabase
      .from('matches')
      .select('id, round_number, draw_segment, division, player1_id, player2_id, winner_id, score, match_index, next_match_id, scheduled_time, court_id')
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

  // Show success banner and clean URL after creation / update redirect
  useEffect(() => {
    if (searchParams.get('created') === '1') {
      setShowCreatedBanner(true)
      router.replace(`/td/tournaments/${id}`)
    }
    if (searchParams.get('updated') === '1') {
      setShowUpdatedBanner(true)
      router.replace(`/td/tournaments/${id}`)
    }
  }, [searchParams, id, router])

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
    if (!uid) return 'TBD'
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
    const { error: genErr } = await generateBracketAndSchedule(
      supabase,
      tournament.id,
      tournament.draw_type,
      forceReset,
      [],
    )
    if (genErr) { setError(genErr); setGeneratingDraw(false); return }
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
      <div className="w-6 h-6 border-2 border-[var(--sl-accent)] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!tournament) return null

  const detail = Array.isArray(tournament.tournament_details)
    ? tournament.tournament_details[0]
    : tournament.tournament_details as unknown as TournamentDetail

  const capacity = detail ? (detail.max_players ?? calcCapacityFromDetail(detail)) : 0
  const divMatches = matches.filter(m => m.division === activeDivision)
  const mainMatches = divMatches.filter(m => m.draw_segment === 'main')
  const plateMatches = divMatches.filter(m => m.draw_segment === 'plate')
  const maxRound = mainMatches.length > 0 ? Math.max(...mainMatches.map(m => m.round_number)) : 0

  // Div counts
  const divCounts: Record<string, number> = {}
  registrations.forEach(r => { if (r.division) divCounts[r.division] = (divCounts[r.division] || 0) + 1 })

  const filteredRegs = playerDivFilter ? registrations.filter(r => r.division === playerDivFilter) : registrations

  return (
    <div>
      {/* Tournament header */}
      <div className="border-b border-[var(--sl-border)] px-6 pt-8 pb-0 max-w-5xl mx-auto">
        <Link href="/td" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--sl-text-30)', textDecoration: 'none' }}>← MY TOURNAMENTS</Link>
        <div className="flex items-start gap-4 mt-4 mb-6">
          <div className="flex-1 min-w-0">
            <h1 style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.1, color: 'var(--sl-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tournament.name}</h1>
            {detail && (
              <p style={{ fontSize: 14, color: 'var(--sl-text-50)', marginTop: 6, lineHeight: 1.4 }}>
                {detail.start_date ? new Date(detail.start_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date TBD'}
                {detail.clubs?.name ? ` · ${detail.clubs.name}` : ''}
                {detail.courts_available ? ` · ${detail.courts_available} courts` : ''}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0" style={{ paddingTop: 4 }}>
            <span className={`text-[10px] font-bold tracking-widest px-3 py-1.5 rounded border ${STATUS_COLOR[tournament.status] ?? STATUS_COLOR.setup_pending}`}>
              {STATUS_LABEL[tournament.status] ?? tournament.status.toUpperCase()}
            </span>
            <Link
              href={`/td/tournaments/new?edit=${tournament.id}`}
              style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--sl-accent)', border: '1px solid var(--sl-accent-30)', borderRadius: 6, padding: '4px 12px', textDecoration: 'none' }}
            >
              EDIT SETUP
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 20px',
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: '0.1em',
                border: 'none',
                borderBottom: activeTab === tab ? '3px solid var(--sl-accent)' : '3px solid transparent',
                marginBottom: -1,
                background: 'none',
                color: activeTab === tab ? 'var(--sl-accent)' : '#000000',
                cursor: 'pointer',
                transition: 'color 0.15s',
                textTransform: 'uppercase',
              }}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-8 max-w-5xl mx-auto">
        {showCreatedBanner && (
          <div className="mb-6 bg-green-900/20 border border-green-700/40 text-green-400 text-sm rounded-xl px-4 py-3 flex justify-between items-center">
            <span>Tournament created! Review your settings below, then open registration when ready.</span>
            <button onClick={() => setShowCreatedBanner(false)} className="ml-3 text-green-600 hover:text-green-400 flex-shrink-0">✕</button>
          </div>
        )}
        {showUpdatedBanner && (
          <div className="mb-6 bg-green-900/20 border border-green-700/40 text-green-400 text-sm rounded-xl px-4 py-3 flex justify-between items-center">
            <span>Tournament updated! Changes are reflected below.</span>
            <button onClick={() => setShowUpdatedBanner(false)} className="ml-3 text-green-600 hover:text-green-400 flex-shrink-0">✕</button>
          </div>
        )}
        {error && (
          <div className="mb-6 bg-[var(--sl-accent-10)] border border-[var(--sl-accent-30)] text-[var(--sl-accent)] text-sm rounded-xl px-4 py-3 flex justify-between">
            {error}
            <button onClick={() => setError(null)} className="ml-3 text-[var(--sl-accent)]">✕</button>
          </div>
        )}

        {/* ── OVERVIEW ──────────────────────────────────────────────────── */}
        {activeTab === 'OVERVIEW' && (
          <OverviewTab tournament={tournament} detail={detail ?? null} registrationCount={registrations.length} />
        )}

        {/* ── SCHEDULE ───────────────────────────────────────────────────── */}
        {activeTab === 'SCHEDULE' && (() => {
          // Group matches with a scheduled_time by day then by court
          const scheduled = matches.filter(m => m.scheduled_time)
          if (scheduled.length === 0) {
            return (
              <div className="border border-dashed border-[var(--sl-border)] rounded-2xl py-16 text-center">
                <p className="text-[var(--sl-text-50)] text-sm">No scheduled matches yet.</p>
                <p className="text-[var(--sl-text-20)] text-xs mt-2">Generate the draw first — the scheduler assigns times and courts automatically.</p>
              </div>
            )
          }
          // Build day → court → matches structure
          const byDay: Record<string, Record<string, Match[]>> = {}
          for (const m of scheduled) {
            const dt = new Date(m.scheduled_time!)
            const dayKey = dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
            const courtKey = `Court ${m.court_id ?? '?'}`
            if (!byDay[dayKey]) byDay[dayKey] = {}
            if (!byDay[dayKey][courtKey]) byDay[dayKey][courtKey] = []
            byDay[dayKey][courtKey].push(m)
          }
          // Sort within each court by scheduled_time
          for (const day of Object.values(byDay)) {
            for (const courtMatches of Object.values(day)) {
              courtMatches.sort((a, b) => new Date(a.scheduled_time!).getTime() - new Date(b.scheduled_time!).getTime())
            }
          }
          return (
            <div className="space-y-10">
              {Object.entries(byDay).map(([dayLabel, courts]) => (
                <div key={dayLabel}>
                  <p className="text-[10px] font-bold tracking-widest text-[var(--sl-text-60)] mb-4 uppercase">{dayLabel}</p>
                  <div className="space-y-6">
                    {Object.entries(courts).sort(([a], [b]) => a.localeCompare(b)).map(([courtLabel, courtMatches]) => (
                      <div key={courtLabel}>
                        <p className="text-[10px] font-bold tracking-widest text-[var(--sl-text-30)] mb-2 uppercase">{courtLabel}</p>
                        <div className="grid gap-2">
                          {courtMatches.map(m => {
                            const dt = new Date(m.scheduled_time!)
                            const time = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                            const p1 = m.player1_id ? (playerMap[m.player1_id] ?? 'TBD') : 'TBD'
                            const p2 = m.player2_id ? (playerMap[m.player2_id] ?? 'TBD') : 'TBD'
                            const segLabel = m.draw_segment === 'plate' ? ' [Plate]' : ''
                            return (
                              <div key={m.id} className="bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-2xl px-4 py-3 flex items-center gap-4 text-sm">
                                <div className="w-12 font-mono text-xs text-[var(--sl-text-60)] shrink-0">{time}</div>
                                <div className="w-20 text-[10px] font-bold tracking-widest text-[var(--sl-accent)] shrink-0 uppercase">{m.division}{segLabel}</div>
                                <div className="flex-1 flex items-center gap-2 min-w-0">
                                  <span className="truncate text-white">{p1}</span>
                                  <span className="text-[var(--sl-text-30)] shrink-0">vs</span>
                                  <span className="truncate text-white">{p2}</span>
                                </div>
                                {m.winner_id && (
                                  <div className="text-[10px] font-bold tracking-widest text-green-500 shrink-0">DONE</div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        })()}

        {/* ── PLAYERS ───────────────────────────────────────────────────── */}
        {activeTab === 'PLAYERS' && (
          <div>
            {/* Capacity panel */}
            {detail && capacity > 0 && (
              <div className="mb-6 bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-2xl px-5 py-4">
                <p className="text-[10px] font-bold tracking-widest text-[var(--sl-text-50)] uppercase mb-3">Court Capacity</p>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--sl-text-60)]">
                  <span><span className="font-bold text-white">{detail.courts_available}</span> courts</span>
                  {detail.start_date && detail.end_date && (
                    <span><span className="font-bold text-white">
                      {Math.max(1, Math.round((new Date(detail.end_date).getTime() - new Date(detail.start_date).getTime()) / 86400000) + 1)}
                    </span> days</span>
                  )}
                  <span><span className="font-bold text-white">{detail.match_duration_minutes}</span>min matches</span>
                  <span className="text-[var(--sl-text-20)]">→</span>
                  <span>comfortable max <span className="font-bold text-[var(--sl-accent)]">{capacity} players</span></span>
                </div>
                <div className="mt-2 text-xs text-[var(--sl-text-30)]">
                  {registrations.length} registered · {Math.max(0, capacity - registrations.length)} spots remaining
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-6">
              <p className="text-[var(--sl-text-50)] text-sm">{registrations.length} registered</p>
              <div className="flex gap-3">
                {tournament.status === 'setup_pending' && (
                  <button onClick={() => setStatus('registration_open')}
                    className="bg-[var(--sl-accent)] hover:bg-[var(--sl-accent-hover)] text-white text-xs font-bold tracking-widest px-4 py-2 rounded-xl transition">
                    OPEN REGISTRATION
                  </button>
                )}
                {tournament.status === 'registration_open' && (
                  <button onClick={() => setStatus('active')}
                    className="border border-[var(--sl-border)] text-[var(--sl-text-60)] text-xs font-bold tracking-widest px-4 py-2 rounded-xl hover:border-[var(--sl-border)] transition">
                    CLOSE REGISTRATION
                  </button>
                )}
                {tournament.status === 'active' && (
                  <button onClick={() => setStatus('completed')}
                    className="border border-[var(--sl-border)] text-[var(--sl-text-60)] text-xs font-bold tracking-widest px-4 py-2 rounded-xl hover:border-[var(--sl-border)] transition">
                    MARK COMPLETED
                  </button>
                )}
              </div>
            </div>

            {/* Division filter tabs */}
            {divs.length > 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                <button
                  onClick={() => setPlayerDivFilter('')}
                  style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                    padding: '5px 14px', borderRadius: 999, cursor: 'pointer', border: 'none',
                    background: playerDivFilter === '' ? 'var(--sl-accent)' : '#ffffff',
                    color: playerDivFilter === '' ? '#ffffff' : 'var(--sl-accent)',
                    outline: playerDivFilter === '' ? 'none' : '1px solid var(--sl-accent)',
                  }}
                >ALL</button>
                {divs.map(d => (
                  <button key={d} onClick={() => setPlayerDivFilter(d === playerDivFilter ? '' : d)}
                    style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                      padding: '5px 14px', borderRadius: 999, cursor: 'pointer', border: 'none',
                      background: playerDivFilter === d ? 'var(--sl-accent)' : '#ffffff',
                      color: playerDivFilter === d ? '#ffffff' : 'var(--sl-accent)',
                      outline: playerDivFilter === d ? 'none' : '1px solid var(--sl-accent)',
                    }}
                  >
                    {d} <span style={{ fontWeight: 400, opacity: 0.7, marginLeft: 4 }}>{divCounts[d] ?? 0}</span>
                  </button>
                ))}
              </div>
            )}

            {registrations.length === 0 ? (
              <div style={{ border: '1px dashed var(--sl-border)', borderRadius: 12, padding: '64px 24px', textAlign: 'center' }}>
                <p style={{ color: 'var(--sl-text-50)', fontSize: 14 }}>No registrations yet.</p>
                {tournament.status === 'setup_pending' && (
                  <p style={{ color: 'var(--sl-text-30)', fontSize: 12, marginTop: 8 }}>Open registration so players can sign up.</p>
                )}
              </div>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid var(--sl-border)', borderRadius: 8 }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--sl-border)', background: '#ffffff' }}>
                      {['NAME', 'DIV', 'USR', 'CLUB', 'PAYMENT', 'DATE'].map(h => (
                        <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--sl-text-50)', padding: '10px 16px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegs.map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--sl-border)', background: '#ffffff' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--sl-surface)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}>
                        <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--sl-text)' }}>{r.first_name} {r.last_name}</td>
                        <td style={{ padding: '10px 16px' }}>
                          {r.division ? (
                            <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 999, background: 'var(--sl-accent)', color: '#ffffff', fontSize: 11, fontWeight: 700 }}>{r.division}</span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--sl-text)' }}>{r.usr_rating ?? '—'}</td>
                        <td style={{ padding: '10px 16px', color: 'var(--sl-text-50)', fontSize: 12 }}>{r.club_name || '—'}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <button onClick={() => cyclePayment(r.id, r.payment_status)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: 999,
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: '0.05em',
                              background: ['fully_paid', 'paid'].includes(r.payment_status) ? '#16a34a' : '#ea580c',
                              color: '#ffffff',
                            }}>
                              {['fully_paid', 'paid'].includes(r.payment_status) ? 'PAID' : r.payment_status.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </button>
                        </td>
                        <td style={{ padding: '10px 16px', color: 'var(--sl-text-50)', fontSize: 12 }}>
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

        {/* ── BRACKET ───────────────────────────────────────────────────── */}
        {activeTab === 'BRACKET' && (
          <div>
            {divs.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {divs.map(d => (
                  <button key={d} onClick={() => { setActiveDivision(d); setActiveDraw('main') }}
                    className={`text-xs font-bold tracking-widest px-4 py-2 rounded-xl border transition ${
                      activeDivision === d ? 'bg-[var(--sl-accent)] border-[var(--sl-accent)] text-white' : 'border-[var(--sl-border)] text-[var(--sl-text-60)] hover:border-[var(--sl-border)]'
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-3 mb-8">
              <button onClick={() => generateDraw(false)} disabled={generatingDraw || matches.length > 0}
                className="bg-[var(--sl-accent)] hover:bg-[var(--sl-accent-hover)] disabled:opacity-40 text-white text-xs font-bold tracking-widest px-4 py-2.5 rounded-xl transition">
                {generatingDraw ? 'GENERATING...' : 'GENERATE DRAW'}
              </button>
              {matches.length > 0 && (
                <button onClick={() => generateDraw(true)}
                  disabled={generatingDraw}
                  className="border border-[var(--sl-border)] text-[var(--sl-text-60)] text-xs font-bold tracking-widest px-4 py-2.5 rounded-xl hover:border-[var(--sl-border)] disabled:opacity-40 transition">
                  REGENERATE (RESET)
                </button>
              )}
            </div>
            {divs.length === 0 && (
              <p className="text-[var(--sl-text-50)] text-sm py-10 text-center">No divisions yet. Players need to register first.</p>
            )}
            {mainMatches.length > 0 && (() => {
              const displayMatches = activeDraw === 'main' ? mainMatches : plateMatches
              const displayMaxRound = activeDraw === 'main'
                ? maxRound
                : (plateMatches.length > 0 ? Math.max(...plateMatches.map(m => m.round_number)) : 0)
              return (
                <div>
                  {/* Division title */}
                  <div className="flex items-center justify-between mb-6 gap-4">
                    <h2 className="text-lg font-black tracking-widest uppercase" style={{ color: 'var(--sl-text)' }}>
                      Division {activeDivision} &mdash; {activeDraw === 'main' ? 'Main Draw' : 'Plate Draw'}
                    </h2>
                    {activeDraw === 'main' && plateMatches.length > 0 && (
                      <button
                        onClick={() => setActiveDraw('plate')}
                        className="text-xs font-bold tracking-widest px-4 py-2 rounded-xl border border-[var(--sl-accent-30)] text-[var(--sl-accent)] hover:bg-[var(--sl-accent-10)] transition shrink-0">
                        PLATE DRAW →
                      </button>
                    )}
                    {activeDraw === 'plate' && (
                      <button
                        onClick={() => setActiveDraw('main')}
                        className="text-xs font-bold tracking-widest px-4 py-2 rounded-xl transition shrink-0" style={{ border: '1px solid var(--sl-border)', color: 'var(--sl-text-60)' }}>
                        ← MAIN DRAW
                      </button>
                    )}
                  </div>
                  {/* Centrefold bracket */}
                  {displayMatches.length > 0 && displayMaxRound > 0 && (
                    <ZoomPanBracket key={activeDivision + activeDraw}>
                      <CentrefoldBracket
                        matches={displayMatches}
                        maxRound={displayMaxRound}
                        playerMap={playerMap}
                        loggedInUserId={userId}
                        onMatchTap={(m) => {
                          setScoreModal(m)
                          setScoreInput(m.score ?? '')
                          setScoreWinner(m.winner_id === m.player1_id ? 'p1' : m.winner_id === m.player2_id ? 'p2' : null)
                        }}
                      />
                    </ZoomPanBracket>
                  )}
                </div>
              )
            })()}
          </div>
        )}

        {/* ── SETUP ─────────────────────────────────────────────────────── */}
        {activeTab === 'SETUP' && (
          <SettingsTab tournament={tournament} detail={detail ?? null} onUpdate={fetchAll} onDelete={deleteTournament} />
        )}
      </div>

      {/* Score modal */}
      {scoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setScoreModal(null)}>
          <div className="bg-[var(--sl-bg)] border border-[var(--sl-border)] rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold tracking-widest mb-1">ENTER SCORE</h3>
            <p className="text-[var(--sl-text-50)] text-xs mb-5">Round {scoreModal.round_number} · {scoreModal.division} · {scoreModal.draw_segment}</p>
            <div className="mb-4">
              <label className="block text-[10px] font-bold tracking-widest text-[var(--sl-text-50)] uppercase mb-2">Score (optional)</label>
              <input className="w-full bg-[var(--sl-surface-deep)] border border-[var(--sl-border)] rounded-xl px-4 py-3 text-sm text-[var(--sl-text)] focus:outline-none focus:border-[var(--sl-accent)] transition"
                placeholder="e.g. 11-8, 11-5, 11-9" value={scoreInput} onChange={e => setScoreInput(e.target.value)} />
            </div>
            <div className="mb-6">
              <label className="block text-[10px] font-bold tracking-widest text-[var(--sl-text-50)] uppercase mb-3">Winner *</label>
              <div className="grid grid-cols-2 gap-3">
                {(['p1', 'p2'] as const).map(key => (
                  <button key={key} onClick={() => setScoreWinner(key)}
                    className={`py-3 px-3 rounded-xl text-sm font-semibold border transition text-center ${
                      scoreWinner === key ? 'border-[var(--sl-accent)] bg-[var(--sl-accent-15)] text-[var(--sl-accent)]' : 'border-[var(--sl-border)] text-[var(--sl-text-60)] hover:border-[var(--sl-border)]'
                    }`}>
                    {playerName(key === 'p1' ? scoreModal.player1_id : scoreModal.player2_id)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setScoreModal(null)}
                className="flex-1 text-xs font-bold tracking-widest text-[var(--sl-text-60)] border border-[var(--sl-border)] py-3 rounded-xl hover:border-[var(--sl-border)] transition">
                CANCEL
              </button>
              <button onClick={saveScore} disabled={!scoreWinner || savingScore}
                className="flex-1 text-xs font-bold tracking-widest bg-[var(--sl-accent)] hover:bg-[var(--sl-accent-hover)] disabled:opacity-40 text-white py-3 rounded-xl transition">
                {savingScore ? 'SAVING...' : 'SAVE RESULT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OvRow({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  if (value === null || value === undefined || value === '') return null
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)
  return (
    <div className="flex justify-between items-baseline gap-4 py-1.5 border-b border-[var(--sl-border)] last:border-0">
      <span className="text-[10px] font-bold tracking-widest text-[var(--sl-text-50)] uppercase flex-shrink-0">{label}</span>
      <span className="text-sm text-[var(--sl-text)] text-right">{display}</span>
    </div>
  )
}

function fmtDate(d: string | null | undefined) {
  if (!d) return null
  return new Date(d + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtTime(t: string | null | undefined) {
  if (!t) return null
  // HH:MM:SS → HH:MM
  return t.slice(0, 5)
}

function parseTime(t: string | null | undefined): number {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function OverviewTab({
  tournament,
  detail,
  registrationCount,
}: {
  tournament: Tournament
  detail: TournamentDetail | null
  registrationCount: number
}) {
  const sCls = 'bg-white border border-black p-5 space-y-1'
  const hCls = 'text-[10px] font-black tracking-widest text-[var(--sl-accent)] uppercase mb-3 pb-2 border-b border-black'

  const days =
    detail?.start_date && detail?.end_date
      ? Math.max(1, Math.round((new Date(detail.end_date).getTime() - new Date(detail.start_date).getTime()) / 86400000) + 1)
      : null

  const dateRange =
    detail?.start_date && detail?.end_date
      ? detail.start_date === detail.end_date
        ? fmtDate(detail.start_date)
        : `${fmtDate(detail.start_date)} – ${fmtDate(detail.end_date)}`
      : null

  const dailyWindow =
    detail?.daily_start_time && detail?.daily_end_time
      ? `${fmtTime(detail.daily_start_time)} – ${fmtTime(detail.daily_end_time)}`
      : null

  const lunchDisplay =
    detail?.lunch_start
      ? `Fixed at ${fmtTime(detail.lunch_start)}, ${detail.lunch_duration_mins ?? 60} min`
      : 'Rolling (no fixed break)'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
      {tournament.status !== 'setup_pending' && (
        <div className="col-span-full mb-1 text-[10px] text-amber-400 bg-amber-900/10 border border-amber-800/40 rounded px-3 py-1">
          Note: Tournament is no longer in setup_pending. Further edits to core schedule/setup may be limited in future flows.
        </div>
      )}

      {/* Tournament */}
      <div className={sCls}>
        <h2 className={hCls}>Tournament</h2>
        <OvRow label="Name" value={tournament.name} />
        <OvRow label="Format" value={tournament.draw_type} />
        <OvRow label="Dates" value={dateRange} />
        <OvRow label="Duration" value={days ? `${days} day${days > 1 ? 's' : ''}` : null} />
        <OvRow label="Registered" value={registrationCount > 0 ? `${registrationCount} players` : 'None yet'} />
        {detail?.registration_opens && (
          <OvRow label="Reg. Opens" value={fmtDate(detail.registration_opens)} />
        )}
        {detail?.registration_deadline && (
          <OvRow label="Reg. Deadline" value={fmtDate(detail.registration_deadline)} />
        )}
      </div>

      {/* Venue */}
      <div className={sCls}>
        <h2 className={hCls}>Venue</h2>
        <OvRow label="Club" value={detail?.clubs?.name} />
        <OvRow label="City" value={detail?.clubs?.city} />
        <OvRow label="Courts" value={detail?.courts_available} />
        {detail?.max_players && <OvRow label="Est. Capacity" value={`${detail.max_players} players`} />}
      </div>

      {/* Schedule
          The schedule data comes from the day_schedules (per-day label/start/end) the user defined
          in wizard Step 3 (SCHEDULE). These are collapsed into daily_start/end + lunch rules by
          buildTournamentDetailsPayload at save time. We reconstruct explicit blocks here for visibility. */}
      <div className={sCls}>
        <h2 className={hCls}>Schedule</h2>
        <OvRow label="Daily Window" value={dailyWindow} />
        <OvRow label="Match Duration" value={detail?.match_duration_minutes ? `${detail.match_duration_minutes} min` : null} />
        <OvRow label="Warm-up" value={detail?.warm_up_minutes ? `${detail.warm_up_minutes} min` : null} />
        <OvRow label="Min Rest" value={detail?.min_rest_hours ? `${detail.min_rest_hours} hrs` : null} />
        <OvRow label="Max / Day" value={detail?.max_matches_per_day ? `${detail.max_matches_per_day} matches` : null} />
        <OvRow label="Lunch" value={lunchDisplay} />
        <OvRow label="Forfeit" value={detail?.forfeit_minutes ? `${detail.forfeit_minutes} min` : null} />

        {/* Explicit per-day blocks (reconstructed from stored daily window + dates; see 007 prompt) */}
        {(() => {
          const blocks = reconstructDaySchedules(
            detail?.start_date,
            detail?.end_date,
            detail?.daily_start_time || detail?.morning_start,
            detail?.daily_end_time,
          )
          if (blocks.length === 0) return null
          const courts = detail?.courts_available ?? 0
          const matchMins = detail?.match_duration_minutes ?? 40
          return (
            <div className="pt-3 mt-2 border-t border-[var(--sl-border)]">
              <span className="text-[10px] font-bold tracking-widest text-[var(--sl-text-50)] uppercase">Defined Schedule Blocks</span>
              <div className="mt-2 space-y-1">
                {blocks.map((b, i) => {
                  // rough per-day slot estimate (simplified, mirrors capacity logic without lunch subtract for display)
                  const slot = matchMins
                  const mins = Math.max(0, (b.end_time ? parseTime(b.end_time) : 0) - (b.start_time ? parseTime(b.start_time) : 0))
                  const perDaySlots = courts > 0 && slot > 0 ? Math.floor(mins / slot) * courts : 0
                  return (
                    <div key={i} className="flex justify-between text-sm text-[var(--sl-text-80)]">
                      <span className="text-[var(--sl-text-50)]">{b.label}</span>
                      <span className="font-mono text-[var(--sl-text-60)]">
                        {b.start_time} – {b.end_time} <span className="text-[var(--sl-text-30)]">· ~{perDaySlots} slots</span>
                      </span>
                    </div>
                  )
                })}
              </div>
              <p className="text-[10px] text-[var(--sl-text-30)] mt-1">Blocks derived from stored daily window (raw per-day variation not persisted separately).</p>
            </div>
          )
        })()}
      </div>

      {/* Entry & Fees */}
      <div className={sCls}>
        <h2 className={hCls}>Entry & Fees</h2>
        <OvRow label="Singles Draw" value={detail?.has_singles_draw} />
        {detail?.has_singles_draw && (
          <OvRow label="Singles Fee" value={detail.singles_entry_fee ? `$${detail.singles_entry_fee}` : 'Free'} />
        )}
        <OvRow label="Doubles Draw" value={detail?.has_doubles_draw} />
        {detail?.has_doubles_draw && (
          <OvRow label="Doubles Fee" value={detail.doubles_entry_fee ? `$${detail.doubles_entry_fee}` : 'Free'} />
        )}
        <OvRow label="Waitlist" value={detail?.has_waitlist ? `Yes — ${detail.waitlist_spots ?? 0} spots` : 'No'} />
        <OvRow label="Multi-division" value={detail?.multi_division_allow_multiple} />
        {Number(detail?.prize_purse) > 0 && (
          <OvRow label="Prize Purse" value={`$${detail!.prize_purse}`} />
        )}
        <OvRow label="Trophy" value={detail?.has_trophy} />
        <OvRow label="Referee" value={detail?.referee_required} />
      </div>

      {/* Day-of */}
      <div className={sCls}>
        <h2 className={hCls}>Day-of Logistics</h2>
        <OvRow
          label="Check-in"
          value={
            detail?.check_in_required
              ? `Required — opens ${detail.check_in_open_mins ?? 60} min before`
              : 'Not required'
          }
        />
        <OvRow label="Live Scoring" value={detail?.live_scoring} />
        <OvRow label="Score Verification" value={detail?.score_verification} />
        <OvRow label="Print Score Sheets" value={detail?.print_score_sheets} />
        <OvRow label="Court Display" value={detail?.court_assignment_display} />
      </div>

      {/* Comms */}
      <div className={sCls}>
        <h2 className={hCls}>Communications</h2>
        <OvRow label="TD Email" value={detail?.td_email} />
        <OvRow label="TD Phone" value={detail?.td_phone_comm} />
        <OvRow label="Auto-notify Draw" value={detail?.auto_notify_draw} />
        <OvRow label="Match Reminders" value={detail?.auto_reminder_match ? `Yes — ${detail.reminder_hours ?? 2} hrs before` : 'Off'} />
        {detail?.sponsor_name && <OvRow label="Sponsor" value={detail.sponsor_name} />}
        {detail?.tournament_notes && (
          <div className="pt-2">
            <p className="text-[10px] font-bold tracking-widest text-[var(--sl-text-50)] uppercase mb-1">Notes</p>
            <p className="text-xs text-[var(--sl-text-60)] whitespace-pre-line">{detail.tournament_notes}</p>
          </div>
        )}
      </div>

    </div>
  )
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function SettToggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="flex items-center gap-3 text-sm text-[var(--sl-text-80)]">
      <div className={`w-10 h-5 rounded-full transition relative ${value ? 'bg-[var(--sl-accent)]' : 'bg-[var(--sl-border)]'}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${value ? 'left-5' : 'left-0.5'}`} />
      </div>
      {label}
    </button>
  )
}

function SettCheck({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer text-sm text-[var(--sl-text-80)]">
      <div onClick={() => onChange(!value)} className={`w-5 h-5 rounded border-2 flex items-center justify-center transition flex-shrink-0 ${value ? 'bg-[var(--sl-accent)] border-[var(--sl-accent)]' : 'border-[var(--sl-border)]'}`}>
        {value && <span className="text-white text-[10px] font-bold">✓</span>}
      </div>
      {label}
    </label>
  )
}

// ─── Bracket Components ────────────────────────────────────────────────────────

function parseSidebarInfo(m: Match): { court: string; time: string } {
  let court = ''
  let time = ''
  if (m.court_id) court = `COURT ${m.court_id}`
  if (m.scheduled_time) {
    const dt = new Date(m.scheduled_time)
    const h = dt.getHours()
    const min = dt.getMinutes().toString().padStart(2, '0')
    const ampm = h >= 12 ? 'pm' : 'am'
    const h12 = h % 12 === 0 ? 12 : h % 12
    time = `${h12}:${min}${ampm}`
  }
  return { court, time }
}

function MatchCard({ m, playerMap, loggedInUserId, onMatchTap }: {
  m: Match
  playerMap: Record<string, string>
  loggedInUserId: string | null
  onMatchTap?: (match: Match) => void
}) {
  const p1w = m.winner_id === m.player1_id && m.winner_id !== null
  const p2w = m.winner_id === m.player2_id && m.winner_id !== null
  const canTap = onMatchTap && (m.player1_id || m.player2_id)
  const { court, time } = parseSidebarInfo(m)
  // R1 bye: one real player, one null slot → show "BYE" not "tbd"
  const isByeMatch = m.round_number === 1 && ((m.player1_id === null) !== (m.player2_id === null))

  function renderRow(uid: string | null, isWinner: boolean, isByeSlot: boolean = false) {
    const isMe = uid !== null && uid === loggedInUserId
    const nameStr = uid === null ? null : (playerMap[uid] ?? uid.slice(0, 8) + '…')

    if (isByeSlot) {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 10px', background: '#000000', minHeight: 34, minWidth: 0,
        }}>
          <span style={{ flex: 1 }} />
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
            color: '#ffffff', background: '#000000',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 999, padding: '2px 8px', flexShrink: 0,
          }}>BYE</span>
        </div>
      )
    }

    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 10px',
        background: isWinner ? '#fa0000' : '#000000',
        minHeight: 34, minWidth: 0,
      }}>
        <span style={{
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontSize: 12, fontWeight: isWinner || isMe ? 700 : 400,
          color: nameStr ? '#ffffff' : 'rgba(255,255,255,0.3)',
          fontStyle: nameStr ? 'normal' : 'italic',
          fontFamily: "'Assistant', sans-serif",
        }}>
          {nameStr ?? 'tbd'}
        </span>
        {isWinner && m.score && (
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#ffffff',
            background: '#000000', borderRadius: 999,
            padding: '2px 7px', marginLeft: 6, whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {m.score}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      onClick={canTap ? () => onMatchTap!(m) : undefined}
      style={{
        minWidth: 180,
        border: '1px solid #000000',
        borderRadius: 0,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        display: 'flex',
        cursor: canTap ? 'pointer' : 'default',
        background: '#000000',
        transition: 'box-shadow 0.15s',
      }}
    >
      {/* Left sidebar: court + time */}
      {(court || time) && (
        <div style={{
          width: 48,
          background: '#1a1a1a',
          borderRight: '1px solid #333333',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px 4px',
          gap: 2,
          flexShrink: 0,
        }}>
          {court && (
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'rgba(255,255,255,0.4)',
              lineHeight: 1.2,
              textAlign: 'center',
            }}>{court}</span>
          )}
          {time && (
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.65)',
              lineHeight: 1.2,
              textAlign: 'center',
            }}>{time}</span>
          )}
        </div>
      )}
      {/* Player rows */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {renderRow(m.player1_id, p1w, isByeMatch && m.player1_id === null)}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
        {renderRow(m.player2_id, p2w, isByeMatch && m.player2_id === null)}
      </div>
    </div>
  )
}

function roundLabel(rn: number, maxRound: number): string {
  if (rn === maxRound) return 'FINAL'
  if (rn === maxRound - 1) return 'SEMI-FINAL'
  if (rn === maxRound - 2) return 'QUARTER-FINAL'
  return `ROUND ${rn}`
}

/** SVG connector column between two adjacent bracket columns.
 *  leftCount: cards in the left (source) column
 *  rightCount: cards in the right (dest) column
 *  colH: height of the card area (excludes label)
 *  leftMatches: matches in the left column (used to check next_match_id)
 *  matchIds: set of all match IDs in the current draw
 */
function BracketConnector({ leftCount, rightCount, colH, leftMatches, matchIds }: {
  leftCount: number
  rightCount: number
  colH: number
  leftMatches?: Match[]
  matchIds?: Set<string>
}) {
  const W = 20
  const LABEL_H = 22

  const bigCount = Math.max(leftCount, rightCount)
  const smallCount = Math.min(leftCount, rightCount)
  const bigSlotH = colH / bigCount
  const smallSlotH = colH / smallCount

  // Returns true if the match at the given left-column index has a valid next match
  function hasValidNext(idx: number): boolean {
    if (!leftMatches || !matchIds) return true
    const m = leftMatches[idx]
    if (!m) return false
    return m.next_match_id != null && matchIds.has(m.next_match_id)
  }

  const lines: string[] = []

  if (leftCount >= rightCount) {
    // Converge: many cards on left → fewer on right
    for (let i = 0; i < smallCount; i++) {
      const y1 = (2 * i + 0.5) * bigSlotH      // left card 2i centre
      const y2 = (2 * i + 1.5) * bigSlotH      // left card 2i+1 centre
      const ym = (i + 0.5) * smallSlotH         // right card i centre
      if (hasValidNext(2 * i)) {
        lines.push(`M0,${y1} H${W / 2} V${ym} H${W}`)
      }
      // Only draw y2 if the second card of this pair actually exists in the column
      if (2 * i + 1 < leftCount && hasValidNext(2 * i + 1)) {
        lines.push(`M0,${y2} H${W / 2} V${ym}`)
      }
    }
    // Odd leftCount: last card has no pair — only draw if it has a valid next match
    if (leftCount % 2 !== 0 && hasValidNext(leftCount - 1)) {
      const y = (leftCount - 0.5) * bigSlotH
      lines.push(`M0,${y} H${W}`)
    }
  } else {
    // Diverge: fewer cards on left → more on right
    for (let i = 0; i < smallCount; i++) {
      const ym = (i + 0.5) * smallSlotH         // left card i centre
      const y1 = (2 * i + 0.5) * bigSlotH      // right card 2i centre
      const y2 = (2 * i + 1.5) * bigSlotH      // right card 2i+1 centre
      lines.push(`M0,${ym} H${W / 2} V${y1} H${W}`)
      lines.push(`M${W / 2},${ym} V${y2} H${W}`)
    }
  }

  return (
    <div className="flex flex-col flex-shrink-0">
      <div style={{ height: LABEL_H }} />
      <svg width={W} height={colH} style={{ display: 'block', overflow: 'visible' }}>
        {lines.map((d, i) => (
          <path key={i} d={d} stroke="#fa0000" strokeWidth="1.5" fill="none"
            strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
    </div>
  )
}

function CentrefoldBracket({ matches, maxRound, playerMap, loggedInUserId, onMatchTap }: {
  matches: Match[]
  maxRound: number
  playerMap: Record<string, string>
  loggedInUserId: string | null
  onMatchTap?: (match: Match) => void
}) {
  // Build sorted rounds
  const rounds: Match[][] = []
  for (let r = 1; r <= maxRound; r++) {
    rounds.push(matches.filter(m => m.round_number === r).sort((a, b) => a.match_index - b.match_index))
  }

  const finalMatches = rounds[maxRound - 1] ?? []

  // Split each round (except final) into top/bottom halves
  const leftCols: { rn: number; matches: Match[] }[] = []
  const rightCols: { rn: number; matches: Match[] }[] = []

  for (let r = 1; r < maxRound; r++) {
    const rMatches = rounds[r - 1]
    const half = Math.ceil(rMatches.length / 2)
    leftCols.push({ rn: r, matches: rMatches.slice(0, half) })
  }
  for (let r = maxRound - 1; r >= 1; r--) {
    const rMatches = rounds[r - 1]
    const half = Math.ceil(rMatches.length / 2)
    rightCols.push({ rn: r, matches: rMatches.slice(half) })
  }

  // Set of all match IDs in this draw — used by BracketConnector to validate next_match_id
  const matchIdSet = new Set(matches.map(m => m.id))

  // Column height: sized for R1 top (largest column) with generous per-card spacing
  const slotH = 116 // px per slot (card ~88px + gap)
  const r1TopCount = leftCols.length > 0 ? leftCols[0].matches.length : 1
  const colH = r1TopCount * slotH

  const labelCls = 'text-[9px] font-black tracking-widest text-center mb-0.5 px-1 whitespace-nowrap uppercase'

  function renderCol(rn: number, colMatches: Match[]) {
    return (
      <div className="flex flex-col flex-shrink-0">
        <div className={labelCls} style={{ height: 22, color: '#fa0000' }}>{roundLabel(rn, maxRound)}</div>
        <div className="flex flex-col justify-around" style={{ height: colH }}>
          {colMatches.map(m => (
            <MatchCard key={m.id} m={m} playerMap={playerMap} loggedInUserId={loggedInUserId} onMatchTap={onMatchTap} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start pb-6" style={{ minWidth: 'max-content' }}>
      {/* Left arm: outermost → inward, with connectors */}
      {leftCols.map(({ rn, matches: cm }, idx) => (
        <React.Fragment key={rn}>
          {renderCol(rn, cm)}
          {/* Connector to next left column or to FINAL */}
          {idx < leftCols.length - 1 ? (
            <BracketConnector leftCount={cm.length} rightCount={leftCols[idx + 1].matches.length} colH={colH} leftMatches={cm} matchIds={matchIdSet} />
          ) : (
            <BracketConnector leftCount={cm.length} rightCount={finalMatches.length} colH={colH} leftMatches={cm} matchIds={matchIdSet} />
          )}
        </React.Fragment>
      ))}

      {/* Centre: FINAL */}
      <div className="flex flex-col flex-shrink-0">
        <div className={labelCls} style={{ height: 22, color: '#fa0000' }}>FINAL</div>
        <div className="flex flex-col justify-around" style={{ height: colH }}>
          {finalMatches.map(m => (
            <MatchCard key={m.id} m={m} playerMap={playerMap} loggedInUserId={loggedInUserId} onMatchTap={onMatchTap} />
          ))}
        </div>
      </div>

      {/* Connector from FINAL to right arm */}
      {rightCols.length > 0 && (
        <BracketConnector leftCount={finalMatches.length} rightCount={rightCols[0].matches.length} colH={colH} />
      )}

      {/* Right arm: inward → outermost, with connectors */}
      {rightCols.map(({ rn, matches: cm }, idx) => (
        <React.Fragment key={rn}>
          {renderCol(rn, cm)}
          {idx < rightCols.length - 1 && (
            <BracketConnector leftCount={cm.length} rightCount={rightCols[idx + 1].matches.length} colH={colH} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

function ZoomPanBracket({ children }: { children: React.ReactNode }) {
  const outerRef = React.useRef<HTMLDivElement>(null)
  const innerRef = React.useRef<HTMLDivElement>(null)
  // Track transform in refs to avoid re-render lag during drag/zoom
  const scaleRef = React.useRef(1)
  const txRef = React.useRef(0)
  const tyRef = React.useRef(0)
  const minScaleRef = React.useRef(1)
  const dragging = React.useRef(false)
  const lastMouse = React.useRef({ x: 0, y: 0 })
  const [containerH, setContainerH] = React.useState<number | 'auto'>('auto')
  const [isDragging, setIsDragging] = React.useState(false)

  function applyTransform() {
    if (!innerRef.current) return
    innerRef.current.style.transform =
      `translate(${txRef.current}px, ${tyRef.current}px) scale(${scaleRef.current})`
  }

  React.useLayoutEffect(() => {
    if (!outerRef.current || !innerRef.current) return
    const availW = outerRef.current.clientWidth
    const availH = window.innerHeight * 0.75
    const contentW = innerRef.current.scrollWidth
    const contentH = innerRef.current.scrollHeight
    if (contentW > 0 && contentH > 0) {
      const initialScale = Math.min(availW / contentW, availH / contentH, 1)
      minScaleRef.current = initialScale
      scaleRef.current = initialScale
      txRef.current = 0
      tyRef.current = 0
      applyTransform()
      setContainerH(Math.ceil(contentH * initialScale) + 32)
    }
  }, [])

  // Native wheel listener — passive:false so preventDefault() fires
  React.useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      scaleRef.current = Math.max(minScaleRef.current, Math.min(3, scaleRef.current * factor))
      applyTransform()
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  // Document-level listeners so drag continues even when cursor leaves the container
  React.useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return
      txRef.current += e.clientX - lastMouse.current.x
      tyRef.current += e.clientY - lastMouse.current.y
      lastMouse.current = { x: e.clientX, y: e.clientY }
      applyTransform()
    }
    function onMouseUp() {
      if (!dragging.current) return
      dragging.current = false
      setIsDragging(false)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    dragging.current = true
    setIsDragging(true)
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }

  return (
    <div
      ref={outerRef}
      className="relative overflow-hidden w-full select-none"
      style={{ height: containerH, minHeight: 200, cursor: isDragging ? 'grabbing' : 'grab' }}
      onMouseDown={onMouseDown}
    >
      <div
        ref={innerRef}
        style={{ transformOrigin: 'top left', display: 'inline-block' }}
      >
        {children}
      </div>
    </div>
  )
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

const DRAW_TYPES_LIST = ['Knockout + Plate', 'Round Robin → Knockout', 'Full Round Robin', 'Monrad']
const FORFEIT_OPTS = ['10', '15', '20']
const REMINDER_OPTS = ['1', '2', '3']
const DISPLAY_OPTS = ['App only', 'App + whiteboard']

function SettingsTab({ tournament, detail, onUpdate, onDelete }: {
  tournament: Tournament
  detail: TournamentDetail | null
  onUpdate: () => void
  onDelete: () => void
}) {
  const iCls = 'w-full bg-[var(--sl-surface-deep)] border border-[var(--sl-border)] rounded-xl px-4 py-3 text-sm text-[var(--sl-text)] focus:outline-none focus:border-[var(--sl-accent)] transition'
  const lCls = 'block text-[10px] font-bold tracking-widest text-[var(--sl-text-50)] uppercase mb-2'
  const sCls = 'bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-2xl p-6 space-y-4'
  const hCls = 'text-sm font-bold tracking-wide text-[var(--sl-text-80)] uppercase'

  const d = detail

  const [f, setF] = useState({
    name: tournament.name,
    draw_type: tournament.draw_type,
    courts_available: String(d?.courts_available ?? '4'),
    has_singles_draw: d?.has_singles_draw ?? true,
    has_doubles_draw: d?.has_doubles_draw ?? false,
    singles_entry_fee: String(d?.singles_entry_fee ?? '0'),
    registration_opens: d?.registration_opens?.slice(0, 10) ?? '',
    registration_deadline: d?.registration_deadline?.slice(0, 10) ?? '',
    has_waitlist: d?.has_waitlist ?? false,
    waitlist_spots: String(d?.waitlist_spots ?? '10'),
    multi_division_allow_multiple: d?.multi_division_allow_multiple ?? false,
    has_referee: d?.referee_required ?? false,
    has_trophy: d?.has_trophy ?? true,
    prize_purse: String(d?.prize_purse ?? '0'),
    has_player_gift: d?.has_player_gift ?? false,
    player_gift_desc: d?.player_gift_desc ?? '',
    sponsor_name: d?.sponsor_name ?? '',
    has_social_event: d?.has_social_event ?? false,
    social_event_time: d?.social_event_time?.slice(0, 5) ?? '',
    social_event_desc: d?.social_event_desc ?? '',
    tournament_notes: d?.tournament_notes ?? '',
    start_date: d?.start_date?.slice(0, 10) ?? '',
    end_date: d?.end_date?.slice(0, 10) ?? '',
    morning_start: d?.morning_start?.slice(0, 5) ?? '08:00',
    has_fixed_lunch: (d?.lunch_duration_mins ?? 0) > 0,
    lunch_start: d?.lunch_start?.slice(0, 5) ?? '12:00',
    lunch_duration_mins: String(d?.lunch_duration_mins ?? '0'),
    afternoon_start: d?.afternoon_start?.slice(0, 5) ?? '13:00',
    has_dinner_break: d?.has_dinner_break ?? false,
    dinner_start: d?.dinner_start?.slice(0, 5) ?? '18:00',
    dinner_duration_mins: String(d?.dinner_duration_mins ?? '60'),
    has_evening_session: d?.has_evening_session ?? false,
    evening_start: d?.evening_start?.slice(0, 5) ?? '19:00',
    daily_end: d?.daily_end_time?.slice(0, 5) ?? '22:00',
    match_duration_minutes: String(d?.match_duration_minutes ?? '40'),
    warm_up_minutes: String(d?.warm_up_minutes ?? '10'),
    min_rest_hours: String(d?.min_rest_hours ?? '3'),
    max_matches_per_day: String(d?.max_matches_per_day ?? '2'),
    forfeit_minutes: String(d?.forfeit_minutes ?? '15'),
    td_email: d?.td_email ?? '',
    td_phone_comm: d?.td_phone_comm ?? '',
    auto_notify_draw: d?.auto_notify_draw ?? true,
    auto_reminder_match: d?.auto_reminder_match ?? true,
    reminder_hours: String(d?.reminder_hours ?? '2'),
    welcome_message: d?.welcome_message ?? '',
    check_in_required: d?.check_in_required ?? true,
    check_in_open_mins: String(d?.check_in_open_mins ?? '60'),
    live_scoring: d?.live_scoring ?? false,
    score_verification: d?.score_verification ?? false,
    print_score_sheets: d?.print_score_sheets ?? false,
    court_assignment_display: d?.court_assignment_display ?? 'App only',
  })

  function set<K extends keyof typeof f>(k: K, v: typeof f[K]) {
    setF(prev => ({ ...prev, [k]: v }))
  }

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function save() {
    setSaving(true)
    setSaveError(null)
    const supabase = createClient()

    const { error: tErr } = await supabase.from('tournaments')
      .update({ name: f.name.trim(), draw_type: f.draw_type })
      .eq('id', tournament.id)
    if (tErr) { setSaveError(tErr.message); setSaving(false); return }

    const { error: dErr } = await supabase.from('tournament_details')
      .update({
        courts_available: Number(f.courts_available) || 1,
        format: f.draw_type,
        daily_start_time: f.morning_start || null,
        daily_end_time: f.daily_end || null,
        start_date: f.start_date || null,
        end_date: f.end_date || null,
        morning_start: f.morning_start || null,
        lunch_start: f.has_fixed_lunch ? f.lunch_start || null : null,
        lunch_duration_mins: f.has_fixed_lunch ? (Number(f.lunch_duration_mins) || 60) : 60,
        afternoon_start: f.afternoon_start || null,
        has_dinner_break: f.has_dinner_break,
        dinner_start: f.has_dinner_break ? f.dinner_start || null : null,
        dinner_duration_mins: f.has_dinner_break ? (Number(f.dinner_duration_mins) || 60) : 60,
        has_evening_session: f.has_evening_session,
        evening_start: f.has_evening_session ? f.evening_start || null : null,
        match_duration_minutes: Number(f.match_duration_minutes) || 40,
        warm_up_minutes: Number(f.warm_up_minutes) || 10,
        min_rest_hours: Number(f.min_rest_hours) || 3,
        min_rest_minutes: (Number(f.min_rest_hours) || 3) * 60,
        max_matches_per_day: Number(f.max_matches_per_day) || 2,
        forfeit_minutes: Number(f.forfeit_minutes) || 15,
        has_singles_draw: f.has_singles_draw,
        has_doubles_draw: f.has_doubles_draw,
        singles_entry_fee: Number(f.singles_entry_fee) || 0,
        registration_opens: f.registration_opens || null,
        registration_deadline: f.registration_deadline || null,
        has_waitlist: f.has_waitlist,
        waitlist_spots: f.has_waitlist ? Number(f.waitlist_spots) || 0 : 0,
        multi_division_allow_multiple: f.multi_division_allow_multiple,
        multi_division: f.multi_division_allow_multiple,
        referee_required: f.has_referee,
        has_trophy: f.has_trophy,
        prize_purse: Number(f.prize_purse) || 0,
        has_player_gift: f.has_player_gift,
        player_gift_desc: f.has_player_gift ? f.player_gift_desc.trim() : '',
        sponsor_name: f.sponsor_name.trim(),
        has_social_event: f.has_social_event,
        social_event_time: f.has_social_event ? f.social_event_time || null : null,
        social_event_desc: f.has_social_event ? f.social_event_desc.trim() : '',
        tournament_notes: f.tournament_notes.trim(),
        td_email: f.td_email.trim(),
        td_phone_comm: f.td_phone_comm.trim(),
        auto_notify_draw: f.auto_notify_draw,
        auto_reminder_match: f.auto_reminder_match,
        reminder_hours: Number(f.reminder_hours) || 2,
        welcome_message: f.welcome_message.trim(),
        check_in_required: f.check_in_required,
        check_in_open_mins: f.check_in_required ? Number(f.check_in_open_mins) || 60 : null,
        live_scoring: f.live_scoring,
        score_verification: f.score_verification,
        print_score_sheets: f.print_score_sheets,
        court_assignment_display: f.court_assignment_display,
      })
      .eq('tournament_id', tournament.id)
    if (dErr) { setSaveError(dErr.message); setSaving(false); return }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    onUpdate()
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {saveError && (
        <div className="bg-[var(--sl-accent-10)] border border-[var(--sl-accent-30)] text-[var(--sl-accent)] text-sm rounded-xl px-4 py-3 flex justify-between">
          {saveError}
          <button onClick={() => setSaveError(null)} className="ml-3 text-[var(--sl-accent)]">✕</button>
        </div>
      )}

      {/* ── BASICS ── */}
      <div className={sCls}>
        <h2 className={hCls}>Tournament Basics</h2>
        <div>
          <label className={lCls}>Tournament Name</label>
          <input className={iCls} value={f.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label className={lCls}>Draw Format</label>
          <select className={iCls} value={f.draw_type} onChange={e => set('draw_type', e.target.value)}>
            {DRAW_TYPES_LIST.map(dt => <option key={dt}>{dt}</option>)}
          </select>
        </div>
        {d?.clubs && (
          <p className="text-xs text-[var(--sl-text-30)]">Venue: {d.clubs.name}{d.clubs.city ? `, ${d.clubs.city}` : ''}</p>
        )}
        <div>
          <label className={lCls}>Courts Available</label>
          <input type="number" min="1" className={iCls} value={f.courts_available} onChange={e => set('courts_available', e.target.value)} />
        </div>
      </div>

      {/* ── REGISTRATION & DRAWS ── */}
      <div className={sCls}>
        <h2 className={hCls}>Registration & Draws</h2>
        <SettToggle value={f.has_singles_draw} onChange={v => set('has_singles_draw', v)} label="Singles draw" />
        <SettToggle value={f.has_doubles_draw} onChange={v => set('has_doubles_draw', v)} label="Doubles draw" />
        <div>
          <label className={lCls}>Singles Entry Fee ($)</label>
          <input type="number" min="0" step="0.01" className={iCls} value={f.singles_entry_fee} onChange={e => set('singles_entry_fee', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lCls}>Registration Opens</label>
            <input type="date" className={iCls} value={f.registration_opens} onChange={e => set('registration_opens', e.target.value)} />
          </div>
          <div>
            <label className={lCls}>Registration Deadline</label>
            <input type="date" className={iCls} value={f.registration_deadline} onChange={e => set('registration_deadline', e.target.value)} />
          </div>
        </div>
        <SettToggle value={f.has_waitlist} onChange={v => set('has_waitlist', v)} label="Enable waitlist" />
        {f.has_waitlist && (
          <div>
            <label className={lCls}>Waitlist Spots</label>
            <input type="number" min="1" className={iCls} value={f.waitlist_spots} onChange={e => set('waitlist_spots', e.target.value)} />
          </div>
        )}
        <SettToggle value={f.multi_division_allow_multiple} onChange={v => set('multi_division_allow_multiple', v)} label="Allow multiple division entry" />
      </div>

      {/* ── PRIZES & OFFICIALS ── */}
      <div className={sCls}>
        <h2 className={hCls}>Prizes & Officials</h2>
        <SettCheck value={f.has_referee} onChange={v => set('has_referee', v)} label="Referee required" />
        <SettCheck value={f.has_trophy} onChange={v => set('has_trophy', v)} label="Trophy awarded" />
        <div>
          <label className={lCls}>Cash Prize Purse ($0 = none)</label>
          <input type="number" min="0" className={iCls} value={f.prize_purse} onChange={e => set('prize_purse', e.target.value)} />
        </div>
        <SettToggle value={f.has_player_gift} onChange={v => set('has_player_gift', v)} label="Player gift" />
        {f.has_player_gift && (
          <div>
            <label className={lCls}>Gift Description</label>
            <input className={iCls} value={f.player_gift_desc} onChange={e => set('player_gift_desc', e.target.value)} />
          </div>
        )}
        <div>
          <label className={lCls}>Sponsor Name (optional)</label>
          <input className={iCls} value={f.sponsor_name} onChange={e => set('sponsor_name', e.target.value)} />
        </div>
      </div>

      {/* ── POST-TOURNAMENT ── */}
      <div className={sCls}>
        <h2 className={hCls}>Post-Tournament</h2>
        <SettToggle value={f.has_social_event} onChange={v => set('has_social_event', v)} label="Social event" />
        {f.has_social_event && (
          <>
            <div>
              <label className={lCls}>Social Event Time</label>
              <input type="time" className={iCls} value={f.social_event_time} onChange={e => set('social_event_time', e.target.value)} />
            </div>
            <div>
              <label className={lCls}>Description</label>
              <input className={iCls} value={f.social_event_desc} onChange={e => set('social_event_desc', e.target.value)} />
            </div>
          </>
        )}
        <div>
          <label className={lCls}>Tournament Notes</label>
          <textarea rows={3} className={`${iCls} resize-none`} value={f.tournament_notes} onChange={e => set('tournament_notes', e.target.value)} />
        </div>
      </div>

      {/* ── SCHEDULE ── */}
      <div className={sCls}>
        <h2 className={hCls}>Schedule</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lCls}>Start Date</label>
            <input type="date" className={iCls} value={f.start_date} onChange={e => set('start_date', e.target.value)} />
          </div>
          <div>
            <label className={lCls}>End Date</label>
            <input type="date" className={iCls} value={f.end_date} onChange={e => set('end_date', e.target.value)} />
          </div>
        </div>
        <div>
          <label className={lCls}>Morning Session Start</label>
          <input type="time" className={iCls} value={f.morning_start} onChange={e => set('morning_start', e.target.value)} />
        </div>
        <SettToggle value={f.has_fixed_lunch} onChange={v => { set('has_fixed_lunch', v); if (!v) set('lunch_duration_mins', '0') }} label="Fixed Lunch Break" />
        {f.has_fixed_lunch ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lCls}>Lunch Break Start</label>
              <input type="time" className={iCls} value={f.lunch_start} onChange={e => set('lunch_start', e.target.value)} />
            </div>
            <div>
              <label className={lCls}>Lunch Duration (mins)</label>
              <input type="number" min="15" step="15" className={iCls} value={f.lunch_duration_mins} onChange={e => set('lunch_duration_mins', e.target.value)} />
            </div>
          </div>
        ) : (
          <p className="text-xs text-[var(--sl-text-50)]">Rolling Lunch — no fixed break</p>
        )}
        <div>
          <label className={lCls}>Afternoon Session Start</label>
          <input type="time" className={iCls} value={f.afternoon_start} onChange={e => set('afternoon_start', e.target.value)} />
        </div>
        <SettToggle value={f.has_dinner_break} onChange={v => set('has_dinner_break', v)} label="Dinner break" />
        {f.has_dinner_break && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lCls}>Dinner Break Start</label>
              <input type="time" className={iCls} value={f.dinner_start} onChange={e => set('dinner_start', e.target.value)} />
            </div>
            <div>
              <label className={lCls}>Dinner Duration (mins)</label>
              <input type="number" min="0" step="15" className={iCls} value={f.dinner_duration_mins} onChange={e => set('dinner_duration_mins', e.target.value)} />
            </div>
          </div>
        )}
        <SettToggle value={f.has_evening_session} onChange={v => set('has_evening_session', v)} label="Evening session" />
        {f.has_evening_session && (
          <div>
            <label className={lCls}>Evening Session Start</label>
            <input type="time" className={iCls} value={f.evening_start} onChange={e => set('evening_start', e.target.value)} />
          </div>
        )}
        <div>
          <label className={lCls}>End of Play</label>
          <input type="time" className={iCls} value={f.daily_end} onChange={e => set('daily_end', e.target.value)} />
        </div>
      </div>

      {/* ── MATCH TIMING ── */}
      <div className={sCls}>
        <h2 className={hCls}>Match Timing</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lCls}>Match Duration (mins)</label>
            <input type="number" min="10" step="5" className={iCls} value={f.match_duration_minutes} onChange={e => set('match_duration_minutes', e.target.value)} />
          </div>
          <div>
            <label className={lCls}>Warm-up (mins)</label>
            <input type="number" min="0" step="5" className={iCls} value={f.warm_up_minutes} onChange={e => set('warm_up_minutes', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lCls}>Min Rest Between Matches (hrs)</label>
            <input type="number" min="1" step="0.5" className={iCls} value={f.min_rest_hours} onChange={e => set('min_rest_hours', e.target.value)} />
          </div>
          <div>
            <label className={lCls}>Max Matches / Day</label>
            <input type="number" min="1" max="5" className={iCls} value={f.max_matches_per_day} onChange={e => set('max_matches_per_day', e.target.value)} />
          </div>
        </div>
        <div>
          <label className={lCls}>Forfeit Rule (no-show)</label>
          <div className="flex gap-3">
            {FORFEIT_OPTS.map(o => (
              <button key={o} type="button" onClick={() => set('forfeit_minutes', o)}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition ${f.forfeit_minutes === o ? 'bg-[var(--sl-accent)] border-[var(--sl-accent)] text-white' : 'border-[var(--sl-border)] text-[var(--sl-text-60)] hover:border-[var(--sl-border)]'}`}>
                {o} min
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── COMMUNICATIONS ── */}
      <div className={sCls}>
        <h2 className={hCls}>Communications</h2>
        <div>
          <label className={lCls}>TD Email</label>
          <input type="email" className={iCls} value={f.td_email} onChange={e => set('td_email', e.target.value)} />
        </div>
        <div>
          <label className={lCls}>TD Phone</label>
          <input type="tel" className={iCls} value={f.td_phone_comm} onChange={e => set('td_phone_comm', e.target.value)} />
        </div>
        <SettToggle value={f.auto_notify_draw} onChange={v => set('auto_notify_draw', v)} label="Notify players when draw is published" />
        <SettToggle value={f.auto_reminder_match} onChange={v => set('auto_reminder_match', v)} label="Send match reminders" />
        {f.auto_reminder_match && (
          <div>
            <label className={lCls}>Reminder hours before match</label>
            <div className="flex gap-3">
              {REMINDER_OPTS.map(o => (
                <button key={o} type="button" onClick={() => set('reminder_hours', o)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition ${f.reminder_hours === o ? 'bg-[var(--sl-accent)] border-[var(--sl-accent)] text-white' : 'border-[var(--sl-border)] text-[var(--sl-text-60)] hover:border-[var(--sl-border)]'}`}>
                  {o}h
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className={lCls}>Welcome Message</label>
          <textarea rows={3} className={`${iCls} resize-none`} value={f.welcome_message} onChange={e => set('welcome_message', e.target.value)} />
        </div>
      </div>

      {/* ── TOURNAMENT DAY ── */}
      <div className={sCls}>
        <h2 className={hCls}>Tournament Day</h2>
        <SettToggle value={f.check_in_required} onChange={v => set('check_in_required', v)} label="Check-in required" />
        {f.check_in_required && (
          <div>
            <label className={lCls}>Check-in opens (mins before first match)</label>
            <input type="number" min="15" step="15" className={iCls} value={f.check_in_open_mins} onChange={e => set('check_in_open_mins', e.target.value)} />
          </div>
        )}
        <SettToggle value={f.live_scoring} onChange={v => set('live_scoring', v)} label="Live scoring" />
        <SettToggle value={f.score_verification} onChange={v => set('score_verification', v)} label="Score verification" />
        <SettToggle value={f.print_score_sheets} onChange={v => set('print_score_sheets', v)} label="Print score sheets" />
        <div>
          <label className={lCls}>Court Assignment Display</label>
          <div className="flex gap-3">
            {DISPLAY_OPTS.map(o => (
              <button key={o} type="button" onClick={() => set('court_assignment_display', o)}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition ${f.court_assignment_display === o ? 'bg-[var(--sl-accent)] border-[var(--sl-accent)] text-white' : 'border-[var(--sl-border)] text-[var(--sl-text-60)] hover:border-[var(--sl-border)]'}`}>
                {o}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── SAVE BUTTON ── */}
      <button onClick={save} disabled={saving}
        className="w-full bg-[var(--sl-accent)] hover:bg-[var(--sl-accent-hover)] disabled:opacity-50 text-white text-base font-bold tracking-wide py-3.5 rounded-xl transition">
        {saved ? 'SAVED ✓' : saving ? 'SAVING...' : 'SAVE CHANGES'}
      </button>

      {/* ── DANGER ZONE ── */}
      <div className="bg-[var(--sl-surface)] border border-red-900/30 rounded-2xl p-6">
        <h2 className="text-sm font-bold tracking-wide text-[var(--sl-accent)] uppercase mb-2">Danger Zone</h2>
        <p className="text-sm text-[var(--sl-text-50)] mb-5">Permanently deletes all registrations, matches, and draw data. This cannot be undone.</p>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            className="text-sm font-bold tracking-wide text-[var(--sl-accent)] border border-[var(--sl-accent-30)] px-5 py-3 rounded-xl hover:bg-[var(--sl-accent-10)] transition">
            DELETE TOURNAMENT
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-bold text-[var(--sl-accent)]">Delete &ldquo;{tournament.name}&rdquo;? All data will be lost.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 text-sm font-bold border border-[var(--sl-border)] text-[var(--sl-text-60)] py-3 rounded-xl hover:border-[var(--sl-border)] transition">
                CANCEL
              </button>
              <button onClick={onDelete}
                className="flex-1 text-sm font-bold bg-[var(--sl-accent)] hover:bg-[var(--sl-accent-hover)] text-white py-3 rounded-xl transition">
                YES, DELETE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
