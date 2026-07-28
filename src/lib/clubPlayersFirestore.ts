import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import {
  DEFAULT_CLUB_PLAYER_GENDER,
  DEFAULT_CLUB_PLAYER_RATING,
  DEFAULT_CLUB_PLAYER_SKILL_LEVEL,
  migrateSkillLevel,
  replaceClubPlayersFromRemote,
  type ClubPlayer,
  type ClubPlayerGender,
} from './clubPlayers'
import { getDb } from './firebase'

const CLUB_PLAYERS_COLLECTION = 'clubPlayers'

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

function parseGender(value: unknown): ClubPlayerGender {
  if (value === 'male' || value === 'female' || value === 'other') return value
  return DEFAULT_CLUB_PLAYER_GENDER
}

function docToClubPlayer(id: string, data: Record<string, unknown>): ClubPlayer {
  const rating =
    typeof data.rating === 'number' && Number.isFinite(data.rating)
      ? data.rating
      : DEFAULT_CLUB_PLAYER_RATING
  const matchesRated =
    typeof data.matchesRated === 'number' && Number.isFinite(data.matchesRated)
      ? Math.max(0, Math.floor(data.matchesRated))
      : 0
  return {
    id,
    name: typeof data.name === 'string' ? data.name.trim() : id,
    gender: parseGender(data.gender),
    skillLevel: migrateSkillLevel(data.skillLevel),
    rating,
    matchesRated,
  }
}

function clubPlayerToDoc(player: ClubPlayer): Record<string, unknown> {
  return removeUndefined({
    id: player.id,
    name: player.name.trim(),
    gender: player.gender ?? DEFAULT_CLUB_PLAYER_GENDER,
    skillLevel: player.skillLevel ?? DEFAULT_CLUB_PLAYER_SKILL_LEVEL,
    rating: Math.round(player.rating ?? DEFAULT_CLUB_PLAYER_RATING),
    matchesRated: player.matchesRated ?? 0,
    updatedAt: new Date().toISOString(),
  })
}

/** Tải danh sách thành viên + Elo/A–B từ Firestore (nguồn sự thật khi xem). */
export async function fetchClubPlayersFromFirestore(): Promise<ClubPlayer[]> {
  const db = getDb()
  const snapshot = await getDocs(collection(db, CLUB_PLAYERS_COLLECTION))
  return snapshot.docs
    .map((item) => docToClubPlayer(item.id, item.data() as Record<string, unknown>))
    .filter((player) => player.name.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
}

/** Ghi toàn bộ danh sách club (sau khi chỉnh A/B + đồng bộ Elo). */
export async function saveClubPlayersToFirestore(players: ClubPlayer[]): Promise<void> {
  const db = getDb()
  const batchSize = 400
  for (let i = 0; i < players.length; i += batchSize) {
    const chunk = players.slice(i, i + batchSize)
    const batch = writeBatch(db)
    for (const player of chunk) {
      if (!player.id || !player.name.trim()) continue
      batch.set(doc(db, CLUB_PLAYERS_COLLECTION, player.id), clubPlayerToDoc(player), {
        merge: true,
      })
    }
    await batch.commit()
  }
}

export async function saveClubPlayerToFirestore(player: ClubPlayer): Promise<void> {
  const db = getDb()
  await setDoc(doc(db, CLUB_PLAYERS_COLLECTION, player.id), clubPlayerToDoc(player), {
    merge: true,
  })
}

/**
 * Subscribe realtime clubPlayers.
 * Khi có dữ liệu remote → ghi đè localStorage để mọi máy cùng Elo/A–B.
 */
export function subscribeClubPlayers(
  onData: (players: ClubPlayer[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = getDb()
  return onSnapshot(
    collection(db, CLUB_PLAYERS_COLLECTION),
    (snapshot) => {
      const players = snapshot.docs
        .map((item) => docToClubPlayer(item.id, item.data() as Record<string, unknown>))
        .filter((player) => player.name.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
      if (players.length > 0) {
        replaceClubPlayersFromRemote(players)
      }
      onData(players)
    },
    (error) => onError?.(error),
  )
}
