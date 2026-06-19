import { findClubPlayerByName } from './clubPlayers'
import { formatParticipantName, normalizeParticipantName } from './showmatchParticipants'
import { fetchAllEvents, upsertEvent } from './storage'
import type { Participant, PickleballEvent } from '../types'

function participantMatchesClubPlayer(
  participant: Participant,
  clubPlayerId: string,
  oldNameNormalized: string,
): boolean {
  if (participant.clubPlayerId === clubPlayerId) return true
  if (participant.clubPlayerId) return false
  return normalizeParticipantName(participant.name) === oldNameNormalized
}

export function applyClubPlayerRenameToEvent(
  event: PickleballEvent,
  clubPlayerId: string,
  oldName: string,
  newName: string,
): PickleballEvent | null {
  const oldNameNormalized = normalizeParticipantName(oldName)
  const formattedNewName = formatParticipantName(newName)
  let changed = false

  const participants = event.participants.map((participant) => {
    if (!participantMatchesClubPlayer(participant, clubPlayerId, oldNameNormalized)) {
      return participant
    }
    if (
      participant.name === formattedNewName &&
      participant.clubPlayerId === clubPlayerId
    ) {
      return participant
    }
    changed = true
    return {
      ...participant,
      name: formattedNewName,
      clubPlayerId,
    }
  })

  if (!changed) return null
  return { ...event, participants }
}

/** Cập nhật tên thành viên trong mọi event Firestore (BXH đọc từ event). */
export async function syncClubPlayerRenameInEvents(
  clubPlayerId: string,
  oldName: string,
  newName: string,
): Promise<number> {
  if (normalizeParticipantName(oldName) === normalizeParticipantName(newName)) {
    return 0
  }

  const events = await fetchAllEvents()
  let updatedCount = 0

  for (const event of events) {
    const updated = applyClubPlayerRenameToEvent(event, clubPlayerId, oldName, newName)
    if (!updated) continue
    await upsertEvent(updated)
    updatedCount += 1
  }

  return updatedCount
}

export function attachClubPlayerId(participant: Participant): Participant {
  if (participant.clubPlayerId) return participant
  const clubPlayer = findClubPlayerByName(participant.name)
  if (!clubPlayer) return participant
  return { ...participant, clubPlayerId: clubPlayer.id }
}

export function participantFromClubSelection(
  name: string,
  skillLevel: Participant['skillLevel'],
): Participant {
  const clubPlayer = findClubPlayerByName(name)
  return {
    id: crypto.randomUUID(),
    name: formatParticipantName(name),
    skillLevel,
    clubPlayerId: clubPlayer?.id,
  }
}
