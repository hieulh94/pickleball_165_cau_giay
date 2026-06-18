import { isShowMatch } from './matches'
import { formatParticipantName, normalizeParticipantName } from './showmatchParticipants'
import type { PickleballEvent } from '../types'

export type LeaderboardSource = 'tournament' | 'showmatch'

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
  contributionMatchIds: Set<string>
  matchesPlayed: number
  wins: number
}

export type PlayerContributionStats = PlayerContribution

function isTournamentEvent(event: PickleballEvent): boolean {
  return event.eventType !== 'showmatch'
}

export function buildPlayerContributionStats(
  events: PickleballEvent[],
  source: LeaderboardSource = 'tournament',
): PlayerContributionStats[] {
  const stats = new Map<string, PlayerContribution>()

  const filteredEvents = events.filter((event) =>
    source === 'showmatch' ? !isTournamentEvent(event) : isTournamentEvent(event),
  )

  for (const event of filteredEvents) {
    const participantById = new Map(event.participants.map((p) => [p.id, p]))
    const pairById = new Map(event.pairs.map((p) => [p.id, p]))

    if (source === 'tournament') {
      const contributions = event.participantContributions
      if (contributions) {
        for (const participant of event.participants) {
          const amount = contributions[participant.id] ?? 0
          if (amount <= 0) continue
          const player = ensurePlayer(stats, participant.name)
          player.totalAmount += amount
          player.contributionEventIds.add(event.id)
        }
      }
    }

    for (const match of event.matches) {
      if (!match.completed) continue

      if (source === 'showmatch' && !isShowMatch(match)) continue
      if (source === 'tournament' && isShowMatch(match)) continue

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

      if (source === 'showmatch' && match.participantContributions) {
        for (const [participantId, amount] of Object.entries(match.participantContributions)) {
          if (amount <= 0) continue
          const participant = participantById.get(participantId)
          if (!participant) continue
          const player = ensurePlayer(stats, participant.name)
          player.totalAmount += amount
          player.contributionEventIds.add(event.id)
          player.contributionMatchIds.add(match.id)
        }
      }
    }
  }

  return [...stats.values()]
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
    contributionMatchIds: new Set(),
    matchesPlayed: 0,
    wins: 0,
  }
  stats.set(key, created)
  return created
}

function contributionCount(row: PlayerContributionStats, source: LeaderboardSource): number {
  return source === 'showmatch' ? row.contributionMatchIds.size : row.contributionEventIds.size
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
  source: LeaderboardSource = 'tournament',
): ContributionStanding[] {
  const rows = buildPlayerContributionStats(events, source)
    .filter((row) => row.totalAmount > 0)
    .map((row) => ({
      name: row.displayName,
      totalAmount: row.totalAmount,
      eventsContributed: contributionCount(row, source),
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

export interface ContributionHistoryEntry {
  eventId: string
  eventName: string
  eventDate: string
  amount: number
  matchName?: string
  matchId?: string
}

export function getPlayerContributionHistory(
  events: PickleballEvent[],
  playerName: string,
  source: LeaderboardSource = 'tournament',
): ContributionHistoryEntry[] {
  const key = normalizeParticipantName(playerName)
  const entries: ContributionHistoryEntry[] = []

  for (const event of events) {
    if (source === 'tournament') {
      if (!isTournamentEvent(event)) continue
      const contributions = event.participantContributions
      if (!contributions) continue

      const participant = event.participants.find(
        (p) => normalizeParticipantName(p.name) === key,
      )
      if (!participant) continue

      const amount = contributions[participant.id] ?? 0
      if (amount <= 0) continue

      entries.push({
        eventId: event.id,
        eventName: event.name,
        eventDate: event.createdAt,
        amount,
      })
      continue
    }

    if (isTournamentEvent(event)) continue

    for (const match of event.matches) {
      if (!isShowMatch(match)) continue
      const contributions = match.participantContributions
      if (!contributions) continue

      const participant = event.participants.find(
        (p) => normalizeParticipantName(p.name) === key,
      )
      if (!participant) continue

      const amount = contributions[participant.id] ?? 0
      if (amount <= 0) continue

      entries.push({
        eventId: event.id,
        eventName: event.name,
        eventDate: match.scheduledAt ?? event.createdAt,
        amount,
        matchName: match.name,
        matchId: match.id,
      })
    }
  }

  return entries.sort(
    (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime(),
  )
}
