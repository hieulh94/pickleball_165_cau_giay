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

function canAddMoreToRound(
  remaining: RawMatchup[],
  usedPairIds: Set<string>,
): boolean {
  return remaining.some(
    (matchup) =>
      !usedPairIds.has(matchup.pair1Id) && !usedPairIds.has(matchup.pair2Id),
  )
}

/**
 * Chia trận thành các vòng; mỗi vòng tối đa `matchesPerRound` trận (thường = số sân).
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

      if (
        round.length < matchesPerRound &&
        remaining.length > 0 &&
        canAddMoreToRound(remaining, usedPairIds)
      ) {
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
  startRound = 1,
): Match[] {
  const matches: Match[] = []
  let displayRound = startRound

  for (const round of rounds) {
    const shuffledMatchups = shuffleArray(round)
    const shuffledCourts = shuffleArray(courts)
    const slotCount = Math.min(shuffledMatchups.length, shuffledCourts.length)

    for (let index = 0; index < slotCount; index++) {
      const matchup = shuffledMatchups[index]
      const match: Match = {
        id: crypto.randomUUID(),
        pair1Id: matchup.pair1Id,
        pair2Id: matchup.pair2Id,
        round: displayRound,
        court: shuffledCourts[index],
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

function collectAllMatchups(pairs: Pair[]): RawMatchup[] {
  const groups = [...new Set(pairs.map((p) => p.group).filter(Boolean))].sort()

  if (groups.length > 0) {
    const allMatchups: RawMatchup[] = []
    for (const group of groups) {
      const pairIds = pairs.filter((p) => p.group === group).map((p) => p.id)
      if (pairIds.length < 2) continue
      allMatchups.push(
        ...generateAllPairings(pairIds).map((m) => ({ ...m, group })),
      )
    }
    return allMatchups
  }

  return generateAllPairings(pairs.map((p) => p.id))
}

export function generateSchedule(pairs: Pair[], courts: number[]): Match[] {
  if (pairs.length < 2 || courts.length === 0) return []

  const sortedCourts = [...courts].sort((a, b) => a - b)
  const allMatchups = collectAllMatchups(pairs)
  if (allMatchups.length === 0) return []

  const matchesPerRound = sortedCourts.length
  const rounds = packMatchesIntoRounds(allMatchups, matchesPerRound)
  return buildMatchesFromRounds(rounds, sortedCourts)
}
