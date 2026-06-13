import { formatParticipantName, normalizeParticipantName } from './showmatchParticipants'
import type { PickleballEvent } from '../types'

export interface ContributionStanding {
  rank: number
  name: string
  totalAmount: number
  eventsContributed: number
  matchesPlayed: number
  wins: number
}

interface PlayerContribution {
  displayName: string
  totalAmount: number
  contributionEventIds: Set<string>
  matchesPlayed: number
  wins: number
}

function ensurePlayer(
  stats: Map<string, PlayerContribution>,
  rawName: string,
): PlayerContribution {
  const key = normalizeParticipantName(rawName)
  const existing = stats.get(key)
  if (existing) return existing

  const created: PlayerContribution = {
    displayName: formatParticipantName(rawName),
    totalAmount: 0,
    contributionEventIds: new Set(),
    matchesPlayed: 0,
    wins: 0,
  }
  stats.set(key, created)
  return created
}

function assignRanks(
  rows: Omit<ContributionStanding, 'rank'>[],
): ContributionStanding[] {
  const result: ContributionStanding[] = []
  for (let i = 0; i < rows.length; i++) {
    let rank = i + 1
    if (i > 0) {
      const cur = rows[i]!
      const prev = rows[i - 1]!
      if (cur.totalAmount === prev.totalAmount && cur.eventsContributed === prev.eventsContributed) {
        rank = result[i - 1]!.rank
      }
    }
    result.push({ ...rows[i]!, rank })
  }
  return result
}

export function calculateContributionStandings(
  events: PickleballEvent[],
): ContributionStanding[] {
  const stats = new Map<string, PlayerContribution>()

  for (const event of events) {
    const participantById = new Map(event.participants.map((p) => [p.id, p]))
    const pairById = new Map(event.pairs.map((p) => [p.id, p]))
    const isTournament = event.eventType !== 'showmatch'
    const contributions = event.participantContributions

    if (isTournament && contributions) {
      for (const participant of event.participants) {
        const amount = contributions[participant.id] ?? 0
        if (amount <= 0) continue
        const player = ensurePlayer(stats, participant.name)
        player.totalAmount += amount
        player.contributionEventIds.add(event.id)
      }
    }

    for (const match of event.matches) {
      if (!match.completed) continue

      const pair1 = pairById.get(match.pair1Id)
      const pair2 = pairById.get(match.pair2Id)
      if (!pair1 || !pair2) continue

      const team1 = [pair1.player1Id, pair1.player2Id]
        .map((id) => participantById.get(id))
        .filter((p): p is NonNullable<typeof p> => !!p)
      const team2 = [pair2.player1Id, pair2.player2Id]
        .map((id) => participantById.get(id))
        .filter((p): p is NonNullable<typeof p> => !!p)

      for (const player of [...team1, ...team2]) {
        ensurePlayer(stats, player.name).matchesPlayed++
      }

      if (match.score1 === undefined || match.score2 === undefined) continue

      if (match.score1 > match.score2) {
        for (const player of team1) ensurePlayer(stats, player.name).wins++
      } else if (match.score2 > match.score1) {
        for (const player of team2) ensurePlayer(stats, player.name).wins++
      }
    }
  }

  const rows = [...stats.values()]
    .filter((row) => row.totalAmount > 0)
    .map((row) => ({
      name: row.displayName,
      totalAmount: row.totalAmount,
      eventsContributed: row.contributionEventIds.size,
      matchesPlayed: row.matchesPlayed,
      wins: row.wins,
    }))
    .sort((a, b) => {
      if (b.totalAmount !== a.totalAmount) return b.totalAmount - a.totalAmount
      if (b.eventsContributed !== a.eventsContributed) return b.eventsContributed - a.eventsContributed
      return a.name.localeCompare(b.name, 'vi')
    })

  return assignRanks(rows)
}
