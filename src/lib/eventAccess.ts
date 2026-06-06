const STORAGE_KEY = 'pickleball_event_access'

function readGrantedIds(): string[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

function writeGrantedIds(ids: string[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // sessionStorage có thể bị chặn — bỏ qua
  }
}

export function isEventAccessGranted(eventId: string): boolean {
  return readGrantedIds().includes(eventId)
}

export function grantEventAccess(eventId: string): void {
  const ids = readGrantedIds()
  if (!ids.includes(eventId)) {
    writeGrantedIds([...ids, eventId])
  }
}

export function eventRequiresPassword(accessPassword: string | undefined): boolean {
  return typeof accessPassword === 'string' && accessPassword.length > 0
}
