import { useEffect, useState } from 'react'
import {
  addClubPlayer,
  getClubPlayers,
  removeClubPlayer,
  updateClubPlayer,
  type ClubPlayer,
  type ClubPlayerGender,
} from '../lib/clubPlayers'

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

  const update = (
    id: string,
    input: { name: string; gender?: ClubPlayerGender },
  ): string | null => {
    const result = updateClubPlayer(id, input)
    if ('error' in result) return result.error
    setPlayers(getClubPlayers())
    return null
  }

  const remove = (id: string) => {
    removeClubPlayer(id)
    setPlayers(getClubPlayers())
  }

  return { players, add, update, remove }
}
