import type { Match, Pair } from '../types'
import { shuffleArray } from './pairing'

type RawMatchup = { pair1Id: string; pair2Id: string; group?: string }

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

/**
 * Chia trận thành các vòng, mỗi vòng đủ `matchesPerRound` trận.
 * Mỗi cặp chỉ xuất hiện tối đa 1 lần trong một vòng.
 */
function packMatchesIntoRounds(
  matchups: RawMatchup[],
  matchesPerRound: number,
): RawMatchup[][] {
  if (matchups.length === 0 || matchesPerRound < 1) return []

  const maxAttempts = 100

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const remaining = shuffleArray(matchups)
    const rounds: RawMatchup[][] = []
    let failed = false

    while (remaining.length > 0) {
      const round: RawMatchup[] = []
      const usedPairIds = new Set<string>()

      for (let i = 0; i < remaining.length && round.length < matchesPerRound; ) {
        const matchup = remaining[i]
        if (!usedPairIds.has(matchup.pair1Id) && !usedPairIds.has(matchup.pair2Id)) {
          round.push(matchup)
          usedPairIds.add(matchup.pair1Id)
          usedPairIds.add(matchup.pair2Id)
          remaining.splice(i, 1)
        } else {
          i++
        }
      }

      if (round.length === 0) {
        failed = true
        break
      }

      if (round.length < matchesPerRound && remaining.length > 0) {
        failed = true
        break
      }

      rounds.push(round)
    }

    if (!failed) return rounds
  }

  return packMatchesIntoRoundsGreedy(matchups, matchesPerRound)
}

/** Dự phòng: ghép từng vòng, vòng cuối có thể thiếu trận nếu không chia hết */
function packMatchesIntoRoundsGreedy(
  matchups: RawMatchup[],
  matchesPerRound: number,
): RawMatchup[][] {
  const remaining = [...matchups]
  const rounds: RawMatchup[][] = []

  while (remaining.length > 0) {
    const round: RawMatchup[] = []
    const usedPairIds = new Set<string>()

    for (let i = 0; i < remaining.length && round.length < matchesPerRound; ) {
      const matchup = remaining[i]
      if (!usedPairIds.has(matchup.pair1Id) && !usedPairIds.has(matchup.pair2Id)) {
        round.push(matchup)
        usedPairIds.add(matchup.pair1Id)
        usedPairIds.add(matchup.pair2Id)
        remaining.splice(i, 1)
      } else {
        i++
      }
    }

    if (round.length === 0) break
    rounds.push(round)
  }

  return rounds
}

function buildMatchesFromRounds(
  rounds: RawMatchup[][],
  courts: number[],
  startRound: number,
): { matches: Match[]; nextRound: number } {
  const matches: Match[] = []
  let displayRound = startRound

  for (const round of rounds) {
    const shuffledMatchups = shuffleArray(round)
    const courtsForRound = shuffleArray(courts).slice(0, shuffledMatchups.length)

    shuffledMatchups.forEach((matchup, index) => {
      const match: Match = {
        id: crypto.randomUUID(),
        pair1Id: matchup.pair1Id,
        pair2Id: matchup.pair2Id,
        round: displayRound,
        court: courtsForRound[index],
        completed: false,
      }
      if (matchup.group) match.group = matchup.group
      matches.push(match)
    })

    displayRound++
  }

  return { matches, nextRound: displayRound }
}

function generateScheduleForPairIds(
  pairIds: string[],
  courts: number[],
  group?: string,
  startRound = 1,
): { matches: Match[]; nextRound: number } {
  if (pairIds.length < 2 || courts.length === 0) {
    return { matches: [], nextRound: startRound }
  }

  const maxSimultaneous = Math.floor(pairIds.length / 2)
  const matchesPerRound = Math.min(courts.length, maxSimultaneous)

  if (matchesPerRound < 1) {
    return { matches: [], nextRound: startRound }
  }

  const matchups = generateAllPairings(pairIds).map((m) =>
    group ? { ...m, group } : m,
  )

  const rounds = packMatchesIntoRounds(matchups, matchesPerRound)
  return buildMatchesFromRounds(rounds, courts, startRound)
}

export function generateSchedule(pairs: Pair[], courts: number[]): Match[] {
  if (pairs.length < 2 || courts.length === 0) return []

  const sortedCourts = [...courts].sort((a, b) => a - b)
  const groups = [...new Set(pairs.map((p) => p.group).filter(Boolean))]

  if (groups.length > 0) {
    const allMatches: Match[] = []
    let nextRound = 1

    for (const group of groups) {
      const pairIds = pairs.filter((p) => p.group === group).map((p) => p.id)
      const { matches, nextRound: after } = generateScheduleForPairIds(
        pairIds,
        sortedCourts,
        group,
        nextRound,
      )
      allMatches.push(...matches)
      nextRound = after
    }

    return allMatches
  }

  return generateScheduleForPairIds(
    pairs.map((p) => p.id),
    sortedCourts,
  ).matches
}
