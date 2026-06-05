import type { Match, Pair } from '../types'

type RawMatchup = { pair1Id: string; pair2Id: string; group?: string }

const MAX_CONSECUTIVE_MATCHES = 2

/** Tất cả cặp đấu vòng bảng (mỗi cặp gặp nhau đúng 1 lần) */
function generateAllPairings(pairIds: string[]): RawMatchup[] {
  const result: RawMatchup[] = []
  for (let i = 0; i < pairIds.length; i++) {
    for (let j = i + 1; j < pairIds.length; j++) {
      result.push({ pair1Id: pairIds[i], pair2Id: pairIds[j] })
    }
  }
  return result
}

function matchupKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`
}

function findMatchup(
  matchups: RawMatchup[],
  pair1Id: string,
  pair2Id: string,
): RawMatchup | undefined {
  const key = matchupKey(pair1Id, pair2Id)
  return matchups.find((m) => matchupKey(m.pair1Id, m.pair2Id) === key)
}

/**
 * 4 đội, 1 sân: 1–4, 2–3, rồi xen kẽ để mỗi đội không đánh liên tiếp quá 2 trận.
 * (pairIds[0]=đội 1, …, pairIds[3]=đội 4)
 */
function orderFourPairsSingleCourt(
  pairIds: string[],
  matchups: RawMatchup[],
): RawMatchup[] {
  const [p1, p2, p3, p4] = pairIds
  const pattern: [string, string][] = [
    [p1, p4],
    [p2, p3],
    [p1, p2],
    [p4, p3],
    [p1, p3],
    [p2, p4],
  ]

  return pattern.map(([a, b]) => findMatchup(matchups, a, b)!)
}

function computeStreaks(
  scheduled: RawMatchup[],
  pairIds: string[],
): Map<string, number> {
  const streaks = new Map(pairIds.map((id) => [id, 0]))

  for (const id of pairIds) {
    let streak = 0
    for (let i = scheduled.length - 1; i >= 0; i--) {
      const match = scheduled[i]
      if (match.pair1Id === id || match.pair2Id === id) streak++
      else break
    }
    streaks.set(id, streak)
  }

  return streaks
}

function wouldStreak(
  streaks: Map<string, number>,
  pairId: string,
  scheduled: RawMatchup[],
): number {
  if (scheduled.length === 0) return 1
  const last = scheduled[scheduled.length - 1]
  if (last.pair1Id === pairId || last.pair2Id === pairId) {
    return (streaks.get(pairId) ?? 0) + 1
  }
  return 1
}

function pairIndexDistance(
  pairIds: string[],
  pair1Id: string,
  pair2Id: string,
): number {
  const i1 = pairIds.indexOf(pair1Id)
  const i2 = pairIds.indexOf(pair2Id)
  if (i1 < 0 || i2 < 0) return 0
  return Math.abs(i1 - i2)
}

function scoreMatchupCandidate(
  matchup: RawMatchup,
  pairIds: string[],
  streaks: Map<string, number>,
  scheduled: RawMatchup[],
): number {
  const nextA = wouldStreak(streaks, matchup.pair1Id, scheduled)
  const nextB = wouldStreak(streaks, matchup.pair2Id, scheduled)
  const restedA = nextA === 1 ? 1 : 0
  const restedB = nextB === 1 ? 1 : 0
  const distance = pairIndexDistance(pairIds, matchup.pair1Id, matchup.pair2Id)

  return (
    Math.max(nextA, nextB) * 1000 -
    (restedA + restedB) * 100 +
    distance * 10 +
    pairIds.indexOf(matchup.pair1Id)
  )
}

function backtrackOrder(
  scheduled: RawMatchup[],
  remaining: RawMatchup[],
  pairIds: string[],
  maxConsecutive: number,
): RawMatchup[] | null {
  if (remaining.length === 0) return scheduled

  const streaks = computeStreaks(scheduled, pairIds)

  const valid = remaining.filter((matchup) => {
    const nextA = wouldStreak(streaks, matchup.pair1Id, scheduled)
    const nextB = wouldStreak(streaks, matchup.pair2Id, scheduled)
    return nextA <= maxConsecutive && nextB <= maxConsecutive
  })

  const candidates = (valid.length > 0 ? valid : remaining).sort(
    (a, b) =>
      scoreMatchupCandidate(a, pairIds, streaks, scheduled) -
      scoreMatchupCandidate(b, pairIds, streaks, scheduled),
  )

  for (const pick of candidates) {
    const rest = remaining.filter((m) => m !== pick)
    const result = backtrackOrder(
      [...scheduled, pick],
      rest,
      pairIds,
      maxConsecutive,
    )
    if (result) return result
  }

  return null
}

/** Sắp xếp trận để hạn chế đội đánh liên tiếp (tối đa `maxConsecutive` trận). */
function orderMatchupsForRest(
  pairIds: string[],
  matchups: RawMatchup[],
  maxConsecutive = MAX_CONSECUTIVE_MATCHES,
): RawMatchup[] {
  if (matchups.length <= 1) return matchups

  if (pairIds.length === 4 && matchups.length === 6) {
    return orderFourPairsSingleCourt(pairIds, matchups)
  }

  return (
    backtrackOrder([], matchups, pairIds, maxConsecutive) ?? [...matchups]
  )
}

function buildMatchesFromRounds(
  rounds: RawMatchup[][],
  courts: number[],
  startRound = 1,
): Match[] {
  const matches: Match[] = []
  let displayRound = startRound

  for (const round of rounds) {
    const slotCount = Math.min(round.length, courts.length)

    for (let index = 0; index < slotCount; index++) {
      const matchup = round[index]
      const match: Match = {
        id: crypto.randomUUID(),
        pair1Id: matchup.pair1Id,
        pair2Id: matchup.pair2Id,
        round: displayRound,
        court: courts[index],
        phase: 'group',
        completed: false,
      }
      if (matchup.group) match.group = matchup.group
      matches.push(match)
    }

    displayRound++
  }

  return matches
}

type MatchupBatch = { pairIds: string[]; matchups: RawMatchup[] }

function collectMatchupBatches(pairs: Pair[]): MatchupBatch[] {
  const groups = [...new Set(pairs.map((p) => p.group).filter(Boolean))].sort()

  if (groups.length > 0) {
    const batches: MatchupBatch[] = []
    for (const group of groups) {
      const pairIds = pairs.filter((p) => p.group === group).map((p) => p.id)
      if (pairIds.length < 2) continue
      batches.push({
        pairIds,
        matchups: generateAllPairings(pairIds).map((m) => ({ ...m, group })),
      })
    }
    return batches
  }

  const pairIds = pairs.map((p) => p.id)
  if (pairIds.length < 2) return []
  return [{ pairIds, matchups: generateAllPairings(pairIds) }]
}

/**
 * Gói trận đã sắp xếp vào từng vòng, tối đa `matchesPerRound` trận/vòng (thường = số sân).
 * VD 4 cặp / 1 sân → 6 vòng, mỗi vòng đúng 1 trận.
 * VD 4 cặp / 2 sân → 3 vòng, mỗi vòng 2 trận.
 */
function packOrderedMatchups(
  ordered: RawMatchup[],
  matchesPerRound: number,
): RawMatchup[][] {
  if (ordered.length === 0 || matchesPerRound < 1) return []

  const rounds: RawMatchup[][] = []
  let currentRound: RawMatchup[] = []
  let usedInRound = new Set<string>()

  const flushRound = () => {
    if (currentRound.length > 0) {
      rounds.push(currentRound)
      currentRound = []
      usedInRound = new Set()
    }
  }

  for (const matchup of ordered) {
    const conflictsRound =
      usedInRound.has(matchup.pair1Id) || usedInRound.has(matchup.pair2Id)
    const roundFull = currentRound.length >= matchesPerRound

    if (conflictsRound || roundFull) {
      flushRound()
    }

    currentRound.push(matchup)
    usedInRound.add(matchup.pair1Id)
    usedInRound.add(matchup.pair2Id)
  }

  flushRound()
  return rounds
}

function scheduleMatchupBatches(
  batches: MatchupBatch[],
  matchesPerRound: number,
): RawMatchup[][] {
  if (batches.length === 0) return []

  if (batches.length === 1) {
    const ordered = orderMatchupsForRest(
      batches[0].pairIds,
      batches[0].matchups,
    )
    return packOrderedMatchups(ordered, matchesPerRound)
  }

  const queues = batches.map((batch) => ({
    ordered: orderMatchupsForRest(batch.pairIds, batch.matchups),
    index: 0,
  }))

  const hasRemaining = () => queues.some((q) => q.index < q.ordered.length)
  const rounds: RawMatchup[][] = []

  while (hasRemaining()) {
    const round: RawMatchup[] = []
    const usedPairIds = new Set<string>()

    for (const queue of queues) {
      while (
        queue.index < queue.ordered.length &&
        round.length < matchesPerRound
      ) {
        const matchup = queue.ordered[queue.index]
        queue.index++

        if (
          !usedPairIds.has(matchup.pair1Id) &&
          !usedPairIds.has(matchup.pair2Id)
        ) {
          round.push(matchup)
          usedPairIds.add(matchup.pair1Id)
          usedPairIds.add(matchup.pair2Id)
          break
        }
      }
    }

    if (round.length === 0) break
    rounds.push(round)
  }

  return rounds
}

export function generateSchedule(pairs: Pair[], courts: number[]): Match[] {
  if (pairs.length < 2 || courts.length === 0) return []

  const sortedCourts = [...courts].sort((a, b) => a - b)
  const matchesPerRound = sortedCourts.length
  const batches = collectMatchupBatches(pairs)
  if (batches.length === 0) return []

  const rounds = scheduleMatchupBatches(batches, matchesPerRound)
  return buildMatchesFromRounds(rounds, sortedCourts)
}
