import {
  DEFAULT_CLUB_PLAYER_GENDER,
  getClubPlayers,
  type ClubPlayerGender,
} from './clubPlayers'
import { isClubPlayersIncompatible } from './randomPairSettings'
import { normalizeParticipantName } from './showmatchParticipants'
import type { Participant } from '../types'

function clubPlayerByParticipantName(name: string) {
  const key = normalizeParticipantName(name)
  return getClubPlayers().find((player) => normalizeParticipantName(player.name) === key)
}

export function getParticipantGender(participant: Participant): ClubPlayerGender {
  return clubPlayerByParticipantName(participant.name)?.gender ?? DEFAULT_CLUB_PLAYER_GENDER
}

export function areParticipantsIncompatible(
  participant1: Participant,
  participant2: Participant,
): boolean {
  const player1 = clubPlayerByParticipantName(participant1.name)
  const player2 = clubPlayerByParticipantName(participant2.name)
  if (!player1 || !player2) return false
  return isClubPlayersIncompatible(player1.id, player2.id)
}
