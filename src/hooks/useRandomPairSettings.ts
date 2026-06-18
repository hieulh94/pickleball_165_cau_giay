import { useEffect, useState } from 'react'
import {
  getRandomPairSettings,
  RANDOM_PAIR_SETTINGS_CHANGED_EVENT,
  setAvoidFemaleFemalePairs,
  setIncompatibleClubPlayers,
  toggleIncompatibleClubPlayers,
  type RandomPairSettings,
} from '../lib/randomPairSettings'

export function useRandomPairSettings() {
  const [settings, setSettings] = useState<RandomPairSettings>(() => getRandomPairSettings())

  useEffect(() => {
    const sync = () => setSettings(getRandomPairSettings())
    window.addEventListener(RANDOM_PAIR_SETTINGS_CHANGED_EVENT, sync)
    return () => window.removeEventListener(RANDOM_PAIR_SETTINGS_CHANGED_EVENT, sync)
  }, [])

  return {
    settings,
    setAvoidFemaleFemalePairs: (value: boolean) => {
      setAvoidFemaleFemalePairs(value)
      setSettings(getRandomPairSettings())
    },
    toggleIncompatible: (playerId: string, otherId: string) => {
      toggleIncompatibleClubPlayers(playerId, otherId)
      setSettings(getRandomPairSettings())
    },
    setIncompatibleForPlayer: (playerId: string, blockedIds: string[]) => {
      setIncompatibleClubPlayers(playerId, blockedIds)
      setSettings(getRandomPairSettings())
    },
  }
}
