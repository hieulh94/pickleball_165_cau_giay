import {
  DEFAULT_CLUB_PLAYER_GENDER,
  findClubPlayerById,
  findClubPlayerByName,
  getClubPlayers,
  type ClubPlayerGender,
} from './clubPlayers'
import { isClubPlayersIncompatible } from './randomPairSettings'
import type { Participant } from '../types'

function clubPlayerForParticipant(participant: Participant) {
  const players = getClubPlayers()
  if (participant.clubPlayerId) {
    return findClubPlayerById(participant.clubPlayerId, players)
  }
  return findClubPlayerByName(participant.name, players)
}

export function getParticipantGender(participant: Participant): ClubPlayerGender {
  return clubPlayerForParticipant(participant)?.gender ?? DEFAULT_CLUB_PLAYER_GENDER
}

export function areParticipantsIncompatible(
  participant1: Participant,
  participant2: Participant,
): boolean {
  const players = getClubPlayers()
  const player1 = participant1.clubPlayerId
    ? findClubPlayerById(participant1.clubPlayerId, players)
    : findClubPlayerByName(participant1.name, players)
  const player2 = participant2.clubPlayerId
    ? findClubPlayerById(participant2.clubPlayerId, players)
    : findClubPlayerByName(participant2.name, players)
  if (!player1 || !player2) return false
  return isClubPlayersIncompatible(player1.id, player2.id)
}
