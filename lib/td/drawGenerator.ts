/**
 * Client-side bracket generator + scheduler.
 * Replicates Flutter BracketGeneratorService + FullBracketScheduler exactly.
 *
 * Sources mirrored:
 *   lib/services/bracket_generator_service.dart
 *   lib/services/full_scheduler_service.dart
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SupabaseClient } from '@supabase/supabase-js'

const DIV_ORDER = ['OPEN', 'A', 'B', 'C', 'D']

// ─── Public Entry Point ───────────────────────────────────────────────────────

/**
 * Generate the full bracket for every division, then schedule every match.
 * Mirrors Flutter: BracketGeneratorService.generateDraw() → FullBracketScheduler.scheduleEverything()
 */
export async function generateBracketAndSchedule(
  supabase: SupabaseClient,
  tournamentId: string,
  format: string,
  forceReset: boolean,
): Promise<{ error?: string }> {
  try {
    // 1. Optional reset
    if (forceReset) {
      const { error: delErr } = await supabase
        .from('matches')
        .delete()
        .eq('tournament_id', tournamentId)
      if (delErr) return { error: delErr.message }
    }

    // 2. Fetch registrations ordered by rating DESC (Flutter's seeding order)
    const { data: regs, error: regsErr } = await supabase
      .from('registrations')
      .select('user_id, division, usr_rating')
      .eq('tournament_id', tournamentId)
      .order('usr_rating', { ascending: false })

    if (regsErr) return { error: regsErr.message }
    if (!regs || regs.length === 0) {
      await supabase.from('tournaments').update({ status: 'active' }).eq('id', tournamentId)
      return {}
    }

    // 3. Group by division (preserving rating-DESC order within each group)
    const byDiv: Record<string, string[]> = {}
    for (const r of regs) {
      if (r.division) {
        if (!byDiv[r.division]) byDiv[r.division] = []
        byDiv[r.division].push(r.user_id as string)
      }
    }

    // Canonical division order, at least 2 players
    const validDivs = DIV_ORDER.filter(d => (byDiv[d]?.length ?? 0) >= 2)
    if (validDivs.length === 0) {
      await supabase.from('tournaments').update({ status: 'active' }).eq('id', tournamentId)
      return {}
    }

    // 4. Build bracket per division
    for (const div of validDivs) {
      const players = byDiv[div]
      const n = players.length

      let bracketSize = 1
      while (bracketSize < n) bracketSize *= 2
      const numRounds = Math.round(Math.log2(bracketSize))

      const mainErr = await buildMainDraw(supabase, tournamentId, div, players, bracketSize, numRounds)
      if (mainErr) return { error: mainErr }

      if (format === 'Knockout + Plate' && n >= 4) {
        const plateErr = await buildPlateDraw(supabase, tournamentId, div, bracketSize, numRounds)
        if (plateErr) return { error: plateErr }

        const linkErr = await linkPlateToMain(supabase, tournamentId, div)
        if (linkErr) return { error: linkErr }
      }

      const byeErr = await advanceByes(supabase, tournamentId, div)
      if (byeErr) return { error: byeErr }
    }

    // 5. Mark tournament active
    await supabase.from('tournaments').update({ status: 'active' }).eq('id', tournamentId)

    // 6. Schedule every match (FullBracketScheduler)
    const schedErr = await scheduleAllMatches(supabase, tournamentId)
    if (schedErr) return { error: schedErr }

    return {}
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

// ─── Bracket Builder ──────────────────────────────────────────────────────────

async function buildMainDraw(
  supabase: SupabaseClient,
  tId: string,
  div: string,
  players: string[],
  bracketSize: number,
  numRounds: number,
): Promise<string | null> {
  const n = players.length
  const nByes = bracketSize - n
  let prevIds: string[] = []

  for (let rnd = 1; rnd <= numRounds; rnd++) {
    const matchesInRound = bracketSize >> rnd
    const toInsert: Record<string, unknown>[] = []

    for (let i = 0; i < matchesInRound; i++) {
      let p1Id: string | null = null
      let p2Id: string | null = null

      if (rnd === 1) {
        if (i < nByes) {
          // Top seed gets BYE; p2 stays null
          p1Id = players[i]
        } else {
          const realIdx = i - nByes
          const playerIdx = nByes + realIdx * 2
          p1Id = playerIdx < n ? players[playerIdx] : null
          p2Id = playerIdx + 1 < n ? players[playerIdx + 1] : null
        }
      }

      const row: Record<string, unknown> = {
        tournament_id: tId,
        round_number: rnd,
        draw_segment: 'main',
        division: div,
        match_index: i,
      }
      if (p1Id) row.player1_id = p1Id
      if (p2Id) row.player2_id = p2Id
      toInsert.push(row)
    }

    const { data: inserted, error } = await supabase
      .from('matches')
      .insert(toInsert)
      .select('id, match_index')
      .order('match_index', { ascending: true })

    if (error) return error.message

    const currIds = (inserted as { id: string }[]).map(r => r.id)

    // Point previous round's matches at their parent in this round
    if (rnd > 1 && prevIds.length > 0) {
      for (let i = 0; i < currIds.length; i++) {
        const parentId = currIds[i]
        for (const childIdx of [i * 2, i * 2 + 1]) {
          if (childIdx < prevIds.length) {
            const { error: e } = await supabase
              .from('matches')
              .update({ next_match_id: parentId })
              .eq('id', prevIds[childIdx])
            if (e) return e.message
          }
        }
      }
    }

    prevIds = currIds
  }

  return null
}

async function buildPlateDraw(
  supabase: SupabaseClient,
  tId: string,
  div: string,
  bracketSize: number,
  numRounds: number,
): Promise<string | null> {
  const plateRounds = numRounds - 1
  if (plateRounds < 1) return null

  let prevIds: string[] = []

  for (let rnd = 1; rnd <= plateRounds; rnd++) {
    // Plate has one fewer round: each plate round has bracketSize >> (rnd+1) matches
    const matchesInRound = (bracketSize >> 1) >> rnd
    const toInsert = Array.from({ length: matchesInRound }, (_, i) => ({
      tournament_id: tId,
      round_number: rnd,
      draw_segment: 'plate',
      division: div,
      match_index: i,
    }))

    const { data: inserted, error } = await supabase
      .from('matches')
      .insert(toInsert)
      .select('id, match_index')
      .order('match_index', { ascending: true })

    if (error) return error.message

    const currIds = (inserted as { id: string }[]).map(r => r.id)

    if (rnd > 1 && prevIds.length > 0) {
      for (let i = 0; i < currIds.length; i++) {
        const parentId = currIds[i]
        for (const childIdx of [i * 2, i * 2 + 1]) {
          if (childIdx < prevIds.length) {
            const { error: e } = await supabase
              .from('matches')
              .update({ next_match_id: parentId })
              .eq('id', prevIds[childIdx])
            if (e) return e.message
          }
        }
      }
    }

    prevIds = currIds
  }

  return null
}

/**
 * Link each main R1 match to its plate R1 counterpart via plate_match_id.
 * Plate match k receives losers from main R1 matches (k*2) and (k*2+1).
 * The DB trigger uses this link to route R1 losers to the correct plate slot.
 */
async function linkPlateToMain(
  supabase: SupabaseClient,
  tId: string,
  div: string,
): Promise<string | null> {
  const { data: mainR1, error: e1 } = await supabase
    .from('matches')
    .select('id, match_index')
    .eq('tournament_id', tId)
    .eq('division', div)
    .eq('draw_segment', 'main')
    .eq('round_number', 1)
    .order('match_index', { ascending: true })

  if (e1) return e1.message

  const { data: plateR1, error: e2 } = await supabase
    .from('matches')
    .select('id, match_index')
    .eq('tournament_id', tId)
    .eq('division', div)
    .eq('draw_segment', 'plate')
    .eq('round_number', 1)
    .order('match_index', { ascending: true })

  if (e2) return e2.message
  if (!plateR1 || plateR1.length === 0) return null

  for (let k = 0; k < plateR1.length; k++) {
    const plateId = (plateR1[k] as any).id as string
    const mainIdx0 = k * 2
    const mainIdx1 = k * 2 + 1

    for (const m of (mainR1 ?? []) as any[]) {
      if (m.match_index === mainIdx0 || m.match_index === mainIdx1) {
        const { error } = await supabase
          .from('matches')
          .update({ plate_match_id: plateId })
          .eq('id', m.id as string)
        if (error) return error.message
      }
    }
  }

  return null
}

/**
 * Auto-advance BYE players: R1 main matches where p1 exists and p2 is null.
 * Setting winner_id fires the DB trigger which propagates the winner to R2.
 */
async function advanceByes(
  supabase: SupabaseClient,
  tId: string,
  div: string,
): Promise<string | null> {
  const { data: byeMatches, error } = await supabase
    .from('matches')
    .select('id, player1_id')
    .eq('tournament_id', tId)
    .eq('division', div)
    .eq('draw_segment', 'main')
    .eq('round_number', 1)
    .not('player1_id', 'is', null)
    .is('player2_id', null)

  if (error) return error.message

  for (const m of (byeMatches ?? []) as any[]) {
    const { error: e } = await supabase
      .from('matches')
      .update({ winner_id: m.player1_id })
      .eq('id', m.id as string)
    if (e) return e.message
  }

  return null
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

/**
 * Greedy court scheduler — mirrors Flutter FullBracketScheduler.scheduleEverything().
 *
 * Processes matches in round ASC order (R1 first), main before plate per round.
 * Assigns the earliest free court to each match.
 * 5-minute turnaround between consecutive matches on the same court.
 * If a match would finish after daily_end → push start to next day's daily_start.
 */
async function scheduleAllMatches(
  supabase: SupabaseClient,
  tournamentId: string,
): Promise<string | null> {
  // Fetch tournament details
  const { data: detail, error: detailErr } = await supabase
    .from('tournament_details')
    .select('courts_available, start_date, match_duration_minutes, daily_start_time, daily_end_time')
    .eq('tournament_id', tournamentId)
    .maybeSingle()

  if (detailErr) return detailErr.message

  const numCourts: number = (detail as any)?.courts_available ?? 4
  const startDateStr: string = (detail as any)?.start_date ?? new Date().toISOString().slice(0, 10)
  const duration: number = (detail as any)?.match_duration_minutes ?? 45
  const dailyStartStr: string = (detail as any)?.daily_start_time ?? '09:00:00'
  const dailyEndStr: string = (detail as any)?.daily_end_time ?? '17:00:00'

  const [sh, sm] = dailyStartStr.split(':').map(Number)
  const [eh, em] = dailyEndStr.split(':').map(Number)

  // Parse start date as a plain calendar date (avoid timezone shift)
  const [sy, smo, sd] = startDateStr.slice(0, 10).split('-').map(Number)

  // Fetch all match IDs ordered by round ASC, draw_segment DESC (main > plate)
  const { data: matchList, error: matchErr } = await supabase
    .from('matches')
    .select('id')
    .eq('tournament_id', tournamentId)
    .order('round_number', { ascending: true })
    .order('draw_segment', { ascending: false })

  if (matchErr) return matchErr.message
  if (!matchList || matchList.length === 0) return null

  // Each court's next free slot (initialised to day-1 start)
  const courtFreeAt: Date[] = Array.from(
    { length: numCourts },
    () => new Date(sy, smo - 1, sd, sh, sm, 0, 0),
  )

  for (const match of matchList as any[]) {
    // Find earliest-free court
    let bestIdx = 0
    for (let i = 1; i < numCourts; i++) {
      if (courtFreeAt[i] < courtFreeAt[bestIdx]) bestIdx = i
    }

    let startTime = new Date(courtFreeAt[bestIdx])

    // If match would finish after daily end, bump to next day's start
    const dayEnd = new Date(
      startTime.getFullYear(), startTime.getMonth(), startTime.getDate(), eh, em, 0, 0,
    )
    if (startTime.getTime() + duration * 60000 > dayEnd.getTime()) {
      startTime = new Date(
        startTime.getFullYear(), startTime.getMonth(), startTime.getDate() + 1, sh, sm, 0, 0,
      )
    }

    // Write scheduled_time + court_id
    const updatePayload: Record<string, unknown> = {
      scheduled_time: startTime.toISOString(),
      court_id: String(bestIdx + 1),
    }

    const { error: updateErr } = await supabase
      .from('matches')
      .update(updatePayload)
      .eq('id', match.id as string)

    if (updateErr) {
      // court_id column may still be UUID — fall back to scheduling without it
      const { error: retryErr } = await supabase
        .from('matches')
        .update({ scheduled_time: startTime.toISOString() })
        .eq('id', match.id as string)
      if (retryErr) return retryErr.message
    }

    // Advance this court's free time (+5 min turnaround)
    courtFreeAt[bestIdx] = new Date(startTime.getTime() + (duration + 5) * 60000)
  }

  return null
}
