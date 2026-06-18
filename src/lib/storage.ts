import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import type { Match, PickleballEvent } from '../types'
import { getDb } from './firebase'

const EVENTS_COLLECTION = 'events'

function migrateEvent(raw: Record<string, unknown>): PickleballEvent {
  const event = raw as unknown as PickleballEvent & {
    courtCount?: number
    accessCode?: string
    accessPassword?: string
  }

  if (!event.courts && typeof event.courtCount === 'number') {
    event.courts = Array.from({ length: event.courtCount }, (_, i) => i + 1)
  }
  if (!event.courts) {
    event.courts = []
  }
  if (typeof event.accessCode !== 'string') {
    event.accessCode = ''
  }
  event.accessCode = event.accessCode.trim().toUpperCase()
  if (typeof event.accessPassword !== 'string') {
    event.accessPassword = ''
  }
  if (event.eventType !== 'tournament' && event.eventType !== 'showmatch') {
    event.eventType = 'tournament'
  }

  const legacyPerPerson = (event as PickleballEvent & { contributionPerPerson?: number })
    .contributionPerPerson
  if (
    typeof legacyPerPerson === 'number' &&
    legacyPerPerson > 0 &&
    Array.isArray(event.participants) &&
    !event.participantContributions
  ) {
    event.participantContributions = Object.fromEntries(
      event.participants.map((participant) => [participant.id, legacyPerPerson]),
    )
  }
  delete (event as PickleballEvent & { contributionPerPerson?: number }).contributionPerPerson

  if (event.participantContributions) {
    const cleaned = Object.fromEntries(
      Object.entries(event.participantContributions).filter(
        ([, amount]) => typeof amount === 'number' && amount > 0,
      ),
    )
    if (Object.keys(cleaned).length === 0) {
      delete event.participantContributions
    } else {
      event.participantContributions = cleaned
    }
  }

  if (Array.isArray(event.matches)) {
    event.matches = event.matches.map((match) => migrateMatch(match))
  }

  return event
}

function migrateMatch(match: Match): Match {
  if (match.phase !== 'showmatch') return match
  let migrated: Match = match
  if (match.showmatchFormat !== 'best_of_3') {
    migrated = { ...migrated, showmatchFormat: 'best_of_3' }
  }
  if (migrated.participantContributions) {
    const cleaned = Object.fromEntries(
      Object.entries(migrated.participantContributions).filter(
        ([, amount]) => typeof amount === 'number' && amount > 0,
      ),
    )
    if (Object.keys(cleaned).length === 0) {
      const { participantContributions: _, ...rest } = migrated
      migrated = rest as Match
    } else {
      migrated = { ...migrated, participantContributions: cleaned }
    }
  }
  return migrated
}

function docToEvent(id: string, data: Record<string, unknown>): PickleballEvent {
  return migrateEvent({ id, ...data })
}

function sortEvents(events: PickleballEvent[]): PickleballEvent[] {
  return [...events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export function subscribeEvents(
  onData: (events: PickleballEvent[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = getDb()

  return onSnapshot(
    collection(db, EVENTS_COLLECTION),
    (snapshot) => {
      const events = snapshot.docs.map((item) =>
        docToEvent(item.id, item.data() as Record<string, unknown>),
      )
      onData(sortEvents(events))
    },
    (error) => onError?.(error),
  )
}

export function subscribeEvent(
  id: string,
  onData: (event: PickleballEvent | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = getDb()

  return onSnapshot(
    doc(db, EVENTS_COLLECTION, id),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null)
        return
      }
      onData(docToEvent(snapshot.id, snapshot.data() as Record<string, unknown>))
    },
    (error) => onError?.(error),
  )
}

function removeUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => removeUndefined(item)) as T
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, removeUndefined(item)]),
    ) as T
  }

  return value
}

export async function upsertEvent(event: PickleballEvent): Promise<void> {
  const db = getDb()
  await setDoc(doc(db, EVENTS_COLLECTION, event.id), removeUndefined(event))
}

export async function deleteEvent(id: string): Promise<void> {
  const db = getDb()
  await deleteDoc(doc(db, EVENTS_COLLECTION, id))
}
