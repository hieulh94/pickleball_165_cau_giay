import { isGroupMatch } from './matches'
import { getPairLabel } from './pairing'
import type { Match, Pair, Participant } from '../types'

export interface PairScheduleEntry {
  matchId: string
  round: number
  court: number
  group?: string
  opponentPairId: string
  opponentPairNumber: number
  opponentLabel: string
  completed: boolean
  scoreText?: string
  isWin?: boolean
}

export function getPairScheduleEntries(
  pairId: string,
  matches: Match[],
  pairs: Pair[],
  participants: Participant[],
  pairNumberById: Map<string, number>,
): PairScheduleEntry[] {
  const pairById = new Map(pairs.map((pair) => [pair.id, pair]))

  return matches
    .filter((match) => isGroupMatch(match))
    .filter((match) => match.pair1Id === pairId || match.pair2Id === pairId)
    .map((match) => {
      const isPair1 = match.pair1Id === pairId
      const opponentPairId = isPair1 ? match.pair2Id : match.pair1Id
      const opponentPair = pairById.get(opponentPairId)
      const opponentPairNumber = pairNumberById.get(opponentPairId) ?? 0
      const opponentLabel = opponentPair
        ? getPairLabel(opponentPair, participants)
        : '—'

      let scoreText: string | undefined
      let isWin: boolean | undefined
      if (
        match.completed &&
        match.score1 !== undefined &&
        match.score2 !== undefined
      ) {
        const ownScore = isPair1 ? match.score1 : match.score2
        const oppScore = isPair1 ? match.score2 : match.score1
        scoreText = `${ownScore}–${oppScore}`
        isWin = ownScore > oppScore
      }

      return {
        matchId: match.id,
        round: match.round,
        court: match.court,
        group: match.group,
        opponentPairId,
        opponentPairNumber,
        opponentLabel,
        completed: match.completed,
        scoreText,
        isWin,
      }
    })
    .sort((a, b) => a.round - b.round || a.court - b.court)
}
