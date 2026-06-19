import { useEffect, useState } from 'react'
import {
  addClubPlayer,
  getClubPlayers,
  removeClubPlayer,
  updateClubPlayer,
  type ClubPlayer,
  type ClubPlayerGender,
} from '../lib/clubPlayers'
import { syncClubPlayerRenameInEvents } from '../lib/clubPlayerSync'
import { isFirebaseConfigured } from '../lib/firebase'
import { normalizeParticipantName } from '../lib/showmatchParticipants'

export function useClubPlayers() {
  const [players, setPlayers] = useState<ClubPlayer[]>(() => getClubPlayers())

  useEffect(() => {
    const sync = () => setPlayers(getClubPlayers())
    window.addEventListener('club-players-changed', sync)
    return () => window.removeEventListener('club-players-changed', sync)
  }, [])

  const add = (name: string, gender?: ClubPlayerGender): string | null => {
    const result = addClubPlayer(name, gender)
    if ('error' in result) return result.error
    setPlayers(getClubPlayers())
    return null
  }

  const update = async (
    id: string,
    input: { name: string; gender?: ClubPlayerGender },
  ): Promise<string | null> => {
    const previous = getClubPlayers().find((player) => player.id === id)
    const result = updateClubPlayer(id, input)
    if ('error' in result) return result.error

    const nameChanged =
      previous &&
      normalizeParticipantName(previous.name) !== normalizeParticipantName(result.player.name)

    if (nameChanged && isFirebaseConfigured()) {
      try {
        await syncClubPlayerRenameInEvents(id, previous.name, result.player.name)
      } catch (err) {
        console.error(err)
        return 'Đã lưu tên trên thiết bị nhưng không đồng bộ được lên event. Kiểm tra mạng và thử lại.'
      }
    }

    setPlayers(getClubPlayers())
    return null
  }

  const remove = (id: string) => {
    removeClubPlayer(id)
    setPlayers(getClubPlayers())
  }

  return { players, add, update, remove }
}
