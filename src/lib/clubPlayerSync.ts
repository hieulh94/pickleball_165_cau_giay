import {
  addClubPlayer,
  findClubPlayerByName,
  getClubPlayers,
  isHigherSkill,
  migrateSkillLevel,
  removeClubPlayer,
  updateClubPlayer,
  type ClubPlayerGender,
} from './clubPlayers'
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

function participantMatchesAnyName(
  participant: Participant,
  oldNamesNormalized: Set<string>,
): boolean {
  return oldNamesNormalized.has(normalizeParticipantName(participant.name))
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

/** Đổi nhiều tên cũ → một tên mới trong 1 event (gộp alias). */
export function applyPlayerNameMergeToEvent(
  event: PickleballEvent,
  oldNames: string[],
  newName: string,
  clubPlayerId?: string,
): PickleballEvent | null {
  const oldSet = new Set(oldNames.map((n) => normalizeParticipantName(n)))
  const formattedNewName = formatParticipantName(newName)
  let changed = false

  const participants = event.participants.map((participant) => {
    if (!participantMatchesAnyName(participant, oldSet)) return participant
    if (
      participant.name === formattedNewName &&
      (!clubPlayerId || participant.clubPlayerId === clubPlayerId)
    ) {
      return participant
    }
    changed = true
    return {
      ...participant,
      name: formattedNewName,
      ...(clubPlayerId ? { clubPlayerId } : {}),
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

/** Gộp nhiều tên trên mọi event → một tên chuẩn. */
export async function syncPlayerNameMergeInEvents(
  oldNames: string[],
  newName: string,
  clubPlayerId?: string,
): Promise<number> {
  const events = await fetchAllEvents()
  let updatedCount = 0

  for (const event of events) {
    const updated = applyPlayerNameMergeToEvent(event, oldNames, newName, clubPlayerId)
    if (!updated) continue
    await upsertEvent(updated)
    updatedCount += 1
  }

  return updatedCount
}

/**
 * Gộp alias trên danh sách CLB localStorage:
 * xóa các tên cũ, đảm bảo có đúng 1 thành viên `newName`.
 */
export function mergeClubPlayerAliases(input: {
  oldNames: string[]
  newName: string
  gender?: ClubPlayerGender
}): { keptId: string; removed: number } {
  const players = getClubPlayers()
  const oldSet = new Set(input.oldNames.map((n) => normalizeParticipantName(n)))

  const toRemove = players.filter((p) => oldSet.has(normalizeParticipantName(p.name)))
  const existingTarget = findClubPlayerByName(input.newName)

  let bestSkill = migrateSkillLevel(existingTarget?.skillLevel)
  for (const p of toRemove) {
    const skill = migrateSkillLevel(p.skillLevel)
    if (isHigherSkill(skill, bestSkill)) bestSkill = skill
  }

  const removeIds = new Set(
    toRemove
      .filter((p) => !existingTarget || p.id !== existingTarget.id)
      .map((p) => p.id),
  )
  for (const id of removeIds) {
    removeClubPlayer(id)
  }

  let keptId: string
  if (existingTarget) {
    updateClubPlayer(existingTarget.id, {
      name: input.newName,
      gender: input.gender ?? existingTarget.gender ?? 'female',
      skillLevel: bestSkill,
    })
    keptId = existingTarget.id
  } else {
    const added = addClubPlayer(input.newName, input.gender ?? 'female', bestSkill)
    if ('error' in added) {
      const again = findClubPlayerByName(input.newName)
      if (!again) throw new Error(added.error)
      keptId = again.id
    } else {
      keptId = added.player.id
    }
  }

  return { keptId, removed: removeIds.size }
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
