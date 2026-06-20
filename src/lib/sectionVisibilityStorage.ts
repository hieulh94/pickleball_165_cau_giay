import {
  DEFAULT_SECTION_VISIBILITY,
  type SectionKey,
} from '../components/CollapsibleSection'

const STORAGE_PREFIX = 'pickleball_section_visibility_'

function storageKey(eventId: string): string {
  return `${STORAGE_PREFIX}${eventId}`
}

function isSectionKey(value: string): value is SectionKey {
  return value in DEFAULT_SECTION_VISIBILITY
}

export function loadSectionVisibility(eventId: string): Record<SectionKey, boolean> {
  try {
    const raw = localStorage.getItem(storageKey(eventId))
    if (!raw) return { ...DEFAULT_SECTION_VISIBILITY }

    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_SECTION_VISIBILITY }
    }

    const merged = { ...DEFAULT_SECTION_VISIBILITY }
    for (const [key, value] of Object.entries(parsed)) {
      if (isSectionKey(key) && typeof value === 'boolean') {
        merged[key] = value
      }
    }
    return merged
  } catch {
    return { ...DEFAULT_SECTION_VISIBILITY }
  }
}

export function saveSectionVisibility(
  eventId: string,
  visibility: Record<SectionKey, boolean>,
): void {
  try {
    localStorage.setItem(storageKey(eventId), JSON.stringify(visibility))
  } catch {
    // localStorage có thể bị chặn — bỏ qua
  }
}
