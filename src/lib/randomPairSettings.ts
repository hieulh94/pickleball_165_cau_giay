const STORAGE_KEY = 'pickleball-random-pair-settings'
const CHANGED_EVENT = 'random-pair-settings-changed'

export interface RandomPairSettings {
  /** Không ghép hai người nữ trong cùng một cặp khi random */
  avoidFemaleFemalePairs: boolean
  /** playerId → danh sách id thành viên không được random cùng cặp */
  incompatibleWith: Record<string, string[]>
}

const DEFAULT_SETTINGS: RandomPairSettings = {
  avoidFemaleFemalePairs: true,
  incompatibleWith: {},
}

function notifyChanged() {
  window.dispatchEvent(new Event(CHANGED_EVENT))
}

function normalizeIncompatibleWith(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== 'object') return {}
  const result: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (typeof key !== 'string' || !Array.isArray(value)) continue
    const ids = value.filter((id): id is string => typeof id === 'string')
    if (ids.length > 0) result[key] = ids
  }
  return result
}

function readSettings(): RandomPairSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<RandomPairSettings> & {
      excludedClubPlayerIds?: string[]
    }
    return {
      avoidFemaleFemalePairs:
        typeof parsed.avoidFemaleFemalePairs === 'boolean'
          ? parsed.avoidFemaleFemalePairs
          : DEFAULT_SETTINGS.avoidFemaleFemalePairs,
      incompatibleWith: normalizeIncompatibleWith(parsed.incompatibleWith),
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function writeSettings(settings: RandomPairSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  notifyChanged()
}

export function getRandomPairSettings(): RandomPairSettings {
  return readSettings()
}

export function setAvoidFemaleFemalePairs(value: boolean): void {
  writeSettings({ ...readSettings(), avoidFemaleFemalePairs: value })
}

export function getIncompatibleIds(playerId: string): string[] {
  return readSettings().incompatibleWith[playerId] ?? []
}

export function isClubPlayersIncompatible(idA: string, idB: string): boolean {
  if (idA === idB) return false
  const settings = readSettings()
  return (settings.incompatibleWith[idA] ?? []).includes(idB)
}

export function toggleIncompatibleClubPlayers(idA: string, idB: string): void {
  if (idA === idB) return
  const settings = readSettings()
  const next = { ...settings.incompatibleWith }
  const aSet = new Set(next[idA] ?? [])
  const bSet = new Set(next[idB] ?? [])

  if (aSet.has(idB)) {
    aSet.delete(idB)
    bSet.delete(idA)
  } else {
    aSet.add(idB)
    bSet.add(idA)
  }

  if (aSet.size === 0) delete next[idA]
  else next[idA] = [...aSet]

  if (bSet.size === 0) delete next[idB]
  else next[idB] = [...bSet]

  writeSettings({ ...settings, incompatibleWith: next })
}

export function setIncompatibleClubPlayers(playerId: string, blockedIds: string[]): void {
  const settings = readSettings()
  const uniqueBlocked = [...new Set(blockedIds.filter((id) => id !== playerId))]
  const next = { ...settings.incompatibleWith }

  for (const otherId of Object.keys(next)) {
    if (otherId === playerId) continue
    const set = new Set(next[otherId] ?? [])
    set.delete(playerId)
    if (set.size === 0) delete next[otherId]
    else next[otherId] = [...set]
  }

  for (const blockedId of uniqueBlocked) {
    const set = new Set(next[blockedId] ?? [])
    set.add(playerId)
    next[blockedId] = [...set]
  }

  if (uniqueBlocked.length === 0) delete next[playerId]
  else next[playerId] = uniqueBlocked

  writeSettings({ ...settings, incompatibleWith: next })
}

export const RANDOM_PAIR_SETTINGS_CHANGED_EVENT = CHANGED_EVENT
