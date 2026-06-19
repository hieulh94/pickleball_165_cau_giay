import {
  DEFAULT_CLUB_PLAYER_GENDER,
  findClubPlayerById,
  findClubPlayerByName,
  type ClubPlayerGender,
} from './clubPlayers'
import { isClubPlayersIncompatible } from './randomPairSettings'
import type { Participant } from '../types'

function clubPlayerForParticipant(participant: Participant) {
  if (participant.clubPlayerId) {
    return findClubPlayerById(participant.clubPlayerId)
  }
  return findClubPlayerByName(participant.name)
}

export function getParticipantGender(participant: Participant): ClubPlayerGender {
  return clubPlayerForParticipant(participant)?.gender ?? DEFAULT_CLUB_PLAYER_GENDER
}

export function areParticipantsIncompatible(
  participant1: Participant,
  participant2: Participant,
): boolean {
  const player1 = clubPlayerForParticipant(participant1)
  const player2 = clubPlayerForParticipant(participant2)
  if (!player1 || !player2) return false
  return isClubPlayersIncompatible(player1.id, player2.id)
}
