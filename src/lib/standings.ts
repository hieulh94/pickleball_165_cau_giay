import type { Match, Pair } from '../types'

export interface PairStanding {
  pairId: string
  rank: number
  played: number
  wins: number
  losses: number
  draws: number
  pointsFor: number
  pointsAgainst: number
  pointDiff: number
}

export interface GroupStandings {
  group: string | null
  standings: PairStanding[]
}

function createEmptyStanding(pairId: string): Omit<PairStanding, 'rank'> {
  return {
    pairId,
    played: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    pointDiff: 0,
  }
}

function rankStandings(items: Omit<PairStanding, 'rank'>[]): PairStanding[] {
  const sorted = [...items].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff
    return b.pointsFor - a.pointsFor
  })

  const result: PairStanding[] = []
  for (let i = 0; i < sorted.length; i++) {
    let rank = i + 1
    if (i > 0) {
      const cur = sorted[i]
      const prev = sorted[i - 1]
      if (
        cur.wins === prev.wins &&
        cur.pointDiff === prev.pointDiff &&
        cur.pointsFor === prev.pointsFor
      ) {
        rank = result[i - 1].rank
      }
    }
    result.push({ ...sorted[i], rank })
  }
  return result
}

function buildStats(pairs: Pair[], matches: Match[]): Map<string, Omit<PairStanding, 'rank'>> {
  const stats = new Map<string, Omit<PairStanding, 'rank'>>()
  for (const pair of pairs) {
    stats.set(pair.id, createEmptyStanding(pair.id))
  }

  for (const match of matches) {
    if (!match.completed || match.score1 === undefined || match.score2 === undefined) {
      continue
    }

    const entries: [string, number, number][] = [
      [match.pair1Id, match.score1, match.score2],
      [match.pair2Id, match.score2, match.score1],
    ]

    for (const [pairId, scored, conceded] of entries) {
      const stat = stats.get(pairId)
      if (!stat) continue

      stat.played++
      stat.pointsFor += scored
      stat.pointsAgainst += conceded
      stat.pointDiff = stat.pointsFor - stat.pointsAgainst

      if (scored > conceded) stat.wins++
      else if (scored < conceded) stat.losses++
      else stat.draws++
    }
  }

  return stats
}

export function calculateStandings(
  pairs: Pair[],
  matches: Match[],
  splitGroups: boolean,
): GroupStandings[] {
  if (pairs.length === 0) return []

  const stats = buildStats(pairs, matches)

  if (splitGroups) {
    const groups = [...new Set(pairs.map((p) => p.group).filter(Boolean))].sort()
    return groups.map((group) => {
      const groupPairs = pairs.filter((p) => p.group === group)
      const groupStats = groupPairs.map((p) => stats.get(p.id) ?? createEmptyStanding(p.id))
      return { group: group as string, standings: rankStandings(groupStats) }
    })
  }

  return [
    {
      group: null,
      standings: rankStandings(pairs.map((p) => stats.get(p.id) ?? createEmptyStanding(p.id))),
    },
  ]
}

export function hasCompletedMatches(matches: Match[]): boolean {
  return matches.some((m) => m.completed)
}
