const STORAGE_KEY = 'pickleball_event_access'

export const EVENT_VIEW_ONLY_PASSWORD = '0'

type EventAccessLevel = 'edit' | 'view'

function readAccessMap(): Record<string, EventAccessLevel> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)

    if (Array.isArray(parsed)) {
      const map: Record<string, EventAccessLevel> = {}
      for (const id of parsed) {
        if (typeof id === 'string') map[id] = 'edit'
      }
      writeAccessMap(map)
      return map
    }

    if (parsed && typeof parsed === 'object') {
      const map: Record<string, EventAccessLevel> = {}
      for (const [id, level] of Object.entries(parsed)) {
        if (level === 'edit' || level === 'view') map[id] = level
      }
      return map
    }

    return {}
  } catch {
    return {}
  }
}

function writeAccessMap(map: Record<string, EventAccessLevel>): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // sessionStorage có thể bị chặn — bỏ qua
  }
}

function setAccessLevel(eventId: string, level: EventAccessLevel): void {
  writeAccessMap({ ...readAccessMap(), [eventId]: level })
}

export function isEventAccessGranted(eventId: string): boolean {
  return eventId in readAccessMap()
}

export function isEventViewOnlyAccess(eventId: string): boolean {
  return readAccessMap()[eventId] === 'view'
}

export function isEventEditAccessGranted(eventId: string): boolean {
  return readAccessMap()[eventId] === 'edit'
}

export function grantEventAccess(eventId: string): void {
  setAccessLevel(eventId, 'edit')
}

export function grantEventViewAccess(eventId: string): void {
  setAccessLevel(eventId, 'view')
}

export function eventRequiresPassword(accessPassword: string | undefined): boolean {
  return typeof accessPassword === 'string' && accessPassword.length > 0
}

export function resolveEventPasswordInput(
  input: string,
  accessPassword: string,
): 'edit' | 'view' | 'invalid' {
  if (input === EVENT_VIEW_ONLY_PASSWORD) return 'view'
  if (input === accessPassword) return 'edit'
  return 'invalid'
}
