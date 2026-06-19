import type { Pair, Participant } from '../types'
import { attachClubPlayerId } from './clubPlayerSync'

export function normalizeParticipantName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function formatParticipantName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function findOrCreateParticipant(
  participants: Participant[],
  rawName: string,
): { participants: Participant[]; participant: Participant } {
  const normalized = normalizeParticipantName(rawName)
  const existed = participants.find(
    (participant) => normalizeParticipantName(participant.name) === normalized,
  )
  if (existed) {
    const withId = attachClubPlayerId(existed)
    if (withId.clubPlayerId && withId.clubPlayerId !== existed.clubPlayerId) {
      return {
        participants: participants.map((p) => (p.id === existed.id ? withId : p)),
        participant: withId,
      }
    }
    return { participants, participant: withId }
  }

  const created: Participant = attachClubPlayerId({
    id: crypto.randomUUID(),
    name: formatParticipantName(rawName),
    skillLevel: 1,
    isManualEntry: true,
  })
  return { participants: [...participants, created], participant: created }
}

export function createManualPair(
  participants: Participant[],
  player1Name: string,
  player2Name: string,
): { participants: Participant[]; pair: Pair } | { error: string } {
  const n1 = normalizeParticipantName(player1Name)
  const n2 = normalizeParticipantName(player2Name)

  if (!n1 || !n2) return { error: 'Hãy nhập đủ tên 2 người chơi trong mỗi cặp.' }
  if (n1 === n2) return { error: 'Hai người trong một cặp phải khác nhau.' }

  let nextParticipants = participants
  const r1 = findOrCreateParticipant(nextParticipants, player1Name)
  nextParticipants = r1.participants
  const r2 = findOrCreateParticipant(nextParticipants, player2Name)
  nextParticipants = r2.participants

  if (r1.participant.id === r2.participant.id) {
    return { error: 'Hai người trong một cặp phải khác nhau.' }
  }

  return {
    participants: nextParticipants,
    pair: {
      id: crypto.randomUUID(),
      player1Id: r1.participant.id,
      player2Id: r2.participant.id,
      locked: true,
      isManual: true,
    },
  }
}

export function getPairPlayerNames(
  pair: Pair | undefined,
  participants: Participant[],
): [string, string] {
  if (!pair) return ['', '']
  const p1 = participants.find((p) => p.id === pair.player1Id)
  const p2 = participants.find((p) => p.id === pair.player2Id)
  return [p1?.name ?? '', p2?.name ?? '']
}

export function pruneOrphanShowmatchPairs(
  pairs: Pair[],
  matches: { pair1Id: string; pair2Id: string }[],
): Pair[] {
  const usedPairIds = new Set<string>()
  for (const match of matches) {
    usedPairIds.add(match.pair1Id)
    usedPairIds.add(match.pair2Id)
  }
  return pairs.filter((pair) => usedPairIds.has(pair.id))
}
