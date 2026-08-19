import { normalizeParticipantName } from './showmatchParticipants'
import type { SkillLevel } from '../types'

export type ClubPlayerGender = 'male' | 'female' | 'other'

export interface ClubPlayer {
  id: string
  name: string
  gender?: ClubPlayerGender
  /** Trình độ CLB (A | B), A mạnh hơn; mặc định B */
  skillLevel?: SkillLevel
  /**
   * Elo từ lịch sử mini game.
   * Chưa có trận: seed theo skill (A→1100, B→900).
   */
  rating?: number
  /** Số trận đã đưa vào Elo */
  matchesRated?: number
}

const GENDER_VALUES: ClubPlayerGender[] = ['male', 'female', 'other']

export const DEFAULT_CLUB_PLAYER_GENDER: ClubPlayerGender = 'male'
export const DEFAULT_CLUB_PLAYER_SKILL_LEVEL: SkillLevel = 'B'
/** Elo trung bình (fallback khi chưa biết trình độ). */
export const DEFAULT_CLUB_PLAYER_RATING = 1000
/** Seed Elo khi trình độ A (mạnh) — chỉ dùng lúc chưa có trận rated. */
export const ELO_SEED_SKILL_A = 1100
/** Seed Elo khi trình độ B (yếu hơn). */
export const ELO_SEED_SKILL_B = 900

/** Elo khởi tạo theo rank A/B. Không dùng khi đã có matchesRated > 0. */
export function seedRatingFromSkillLevel(skillLevel?: SkillLevel): number {
  const level = parseSkillLevel(skillLevel) ?? DEFAULT_CLUB_PLAYER_SKILL_LEVEL
  return level === 'A' ? ELO_SEED_SKILL_A : ELO_SEED_SKILL_B
}

const STORAGE_KEY = 'pickleball-165-club-players'

const CLUB_PLAYER_NAMES = [
  'Hiếu LH',
  'Hoa Ngọc Lan',
  'Tùng',
  'Việt Mx',
  'Sơn Phạm',
  'Thái Anh',
  'Nguyễn Xuân Tùng',
  'Cong Pham',
  'Nguyen Thach Le',
  'Dang Khôi',
  'Trúc Mai',
  'Anh Minh( ghẹ Trúc Mai)',
  'Dohongcuong',
  'Le Ha Chi',
  'Đinh Huy',
  'Đức Công Act',
  'Dương Gà',
  'Chị Vân Anh',
  'NH Đoàn',
  'Giangcv',
  'Duy Anh',
  'Hanhtranvti',
  'Hoàng Cúc',
  'Hoàng Long',
  'Kiều Đức Nam',
  'Dũng',
  'Lĩnh Bonus',
  'Linh Lan',
  'Mạnh Hùng',
  'Nguyên Dk',
  'Phung The Anh',
  'Rose Thuy Nhung',
  'Thanh Huệ',
  'The Anh Andrew',
  'Trần Đại Nghĩa',
  'Trần Tuấn Ngọc',
  'Trần Văn Khanh',
  'Dattt',
  'Tuan Nguyen',
  'Vinh Tran',
  'Vũ Thiên Tân',
  'Bích Ngọc',
] as const

/** Thành viên nữ đã biết — seed + sửa lại nếu bị ghi đè thành nam. */
const KNOWN_FEMALE_NAMES = [
  'Hoa Ngọc Lan',
  'Trúc Mai',
  'Le Ha Chi',
  'Chị Vân Anh',
  'Hanhtranvti',
  'Hoàng Cúc',
  'Linh Lan',
  'Rose Thuy Nhung',
  'Thanh Huệ',
  'Bích Ngọc',
] as const

const KNOWN_FEMALE_NAME_KEYS = new Set(
  KNOWN_FEMALE_NAMES.map((n) => normalizeParticipantName(n)),
)

function seedGenderForName(name: string): ClubPlayerGender {
  if (KNOWN_FEMALE_NAME_KEYS.has(normalizeParticipantName(name))) return 'female'
  return DEFAULT_CLUB_PLAYER_GENDER
}

function parseGender(value: unknown): ClubPlayerGender | undefined {
  if (typeof value === 'string' && GENDER_VALUES.includes(value as ClubPlayerGender)) {
    return value as ClubPlayerGender
  }
  return undefined
}

/** Parse trình độ; migrate số cũ 2→A (mạnh), 1→B (yếu). */
export function parseSkillLevel(value: unknown): SkillLevel | undefined {
  if (value === 'A' || value === 'B') return value
  if (value === 'a' || value === 'b') return value.toUpperCase() as SkillLevel
  // Legacy numeric: 2 = mạnh → A, 1 = yếu → B
  if (value === 2 || value === '2') return 'A'
  if (value === 1 || value === '1') return 'B'
  return undefined
}

/** A mạnh hơn B. */
export function skillLevelRank(level: SkillLevel): number {
  return level === 'A' ? 2 : 1
}

export function isHigherSkill(a: SkillLevel, b: SkillLevel): boolean {
  return skillLevelRank(a) > skillLevelRank(b)
}

export function migrateSkillLevel(value: unknown): SkillLevel {
  return parseSkillLevel(value) ?? DEFAULT_CLUB_PLAYER_SKILL_LEVEL
}

function parseRating(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return undefined
}

function parseMatchesRated(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.floor(value)
  }
  return undefined
}

export function formatClubPlayerGender(gender?: ClubPlayerGender): string {
  switch (gender) {
    case 'male':
      return 'Nam'
    case 'female':
      return 'Nữ'
    case 'other':
      return 'Khác'
    default:
      return 'Nam'
  }
}

/** Nhãn trình độ kèm giới: Nam A, Nữ B, Khác A… */
export function formatGenderSkillLabel(
  gender: ClubPlayerGender | undefined,
  skillLevel: SkillLevel,
): string {
  return `${formatClubPlayerGender(gender)} ${migrateSkillLevel(skillLevel)}`
}

function resolveGender(gender?: ClubPlayerGender): ClubPlayerGender {
  return parseGender(gender) ?? DEFAULT_CLUB_PLAYER_GENDER
}

function resolveSkillLevel(skillLevel?: SkillLevel): SkillLevel {
  return parseSkillLevel(skillLevel) ?? DEFAULT_CLUB_PLAYER_SKILL_LEVEL
}

function resolveRating(rating?: number, skillLevel?: SkillLevel): number {
  return parseRating(rating) ?? seedRatingFromSkillLevel(skillLevel)
}

function normalizeClubPlayer(item: ClubPlayer): ClubPlayer {
  const raw = item as ClubPlayer & Record<string, unknown>
  const skillLevel = resolveSkillLevel(parseSkillLevel(raw.skillLevel) ?? item.skillLevel)
  const matchesRated = parseMatchesRated(raw.matchesRated) ?? item.matchesRated ?? 0
  const parsedRating = parseRating(raw.rating) ?? parseRating(item.rating)
  // Chưa có trận rated → luôn seed theo A/B (không giữ 1000 phẳng cũ).
  const rating =
    matchesRated === 0
      ? seedRatingFromSkillLevel(skillLevel)
      : (parsedRating ?? seedRatingFromSkillLevel(skillLevel))
  return {
    id: item.id,
    name: item.name.trim(),
    gender: resolveGender(item.gender),
    skillLevel,
    rating,
    matchesRated,
  }
}

function buildSeedPlayers(): ClubPlayer[] {
  return CLUB_PLAYER_NAMES.map((name) =>
    normalizeClubPlayer({
      id: buildClubPlayerId(name),
      name,
      gender: seedGenderForName(name),
      skillLevel: DEFAULT_CLUB_PLAYER_SKILL_LEVEL,
      rating: seedRatingFromSkillLevel(DEFAULT_CLUB_PLAYER_SKILL_LEVEL),
      matchesRated: 0,
    }),
  )
}

/** true nếu localStorage còn rating phẳng/sai seed trong khi chưa có trận. */
function needsRatingSeedMigration(stored: ClubPlayer[]): boolean {
  return stored.some((player) => {
    const matchesRated = parseMatchesRated(player.matchesRated) ?? 0
    if (matchesRated > 0) return false
    const skillLevel = resolveSkillLevel(player.skillLevel)
    const expected = seedRatingFromSkillLevel(skillLevel)
    return parseRating(player.rating) !== expected
  })
}

/** Không ghi đè gender đã có; ưu tiên female nếu bất kỳ nguồn nào là nữ. */
function resolveMergeGender(
  target: ClubPlayer | undefined,
  aliases: ClubPlayer[],
  fallback: ClubPlayerGender,
): ClubPlayerGender {
  const candidates = [target?.gender, ...aliases.map((a) => a.gender)].filter(
    (g): g is ClubPlayerGender => !!g,
  )
  if (candidates.includes('female')) return 'female'
  if (target?.gender) return target.gender
  if (candidates.includes('other')) return 'other'
  if (candidates.includes('male')) return 'male'
  return fallback
}

const KNOWN_NAME_MERGES: Array<{
  from: string[]
  to: string
  gender: ClubPlayerGender
}> = [
  {
    from: ['Vk of Dương Gà', 'Vk a Duong', 'Vk of Duong Ga', 'Vk a Dương'],
    to: 'Chị Vân Anh',
    gender: 'female',
  },
  {
    from: ['Tùng YB', 'Tung YB'],
    to: 'Tùng',
    gender: 'male',
  },
  {
    from: ['Việt MX'],
    to: 'Việt Mx',
    gender: 'male',
  },
  {
    from: ['Nguyen DK', 'Nguyen Dk', 'Nguyên DK'],
    to: 'Nguyên Dk',
    gender: 'male',
  },
  {
    from: [
      'Minh',
      'Ghẹ Chị Trúc Mai',
      'Ghe Chi Truc Mai',
      'Minh (ck Trúc Mai)',
      'Minh (ck Truc Mai)',
      'Ck chị Trúc Mai',
      'Ck chi Truc Mai',
      'Anh Minh (ghẹ Trúc Mai)',
      'Anh Minh(ghẹ Trúc Mai)',
    ],
    to: 'Anh Minh( ghẹ Trúc Mai)',
    gender: 'male',
  },
]

function applyKnownNameMerges(players: ClubPlayer[]): { players: ClubPlayer[]; changed: boolean } {
  let next = [...players]
  let changed = false

  for (const merge of KNOWN_NAME_MERGES) {
    const fromKeys = new Set(merge.from.map((n) => normalizeParticipantName(n)))
    const toKey = normalizeParticipantName(merge.to)
    const canonicalId = buildClubPlayerId(merge.to)
    const aliases = next.filter((p) => fromKeys.has(normalizeParticipantName(p.name)))

    // Target: đúng tên chuẩn, hoặc cùng id seed (đã đổi tên hiển thị).
    const target =
      next.find((p) => normalizeParticipantName(p.name) === toKey) ??
      next.find((p) => p.id === canonicalId)

    // Không còn alias → không tạo lại / không ép tên (tránh ghi đè khi user đổi tên).
    if (aliases.length === 0) {
      continue
    }

    let bestSkill: SkillLevel = target?.skillLevel ?? DEFAULT_CLUB_PLAYER_SKILL_LEVEL
    let bestMatches = target?.matchesRated ?? 0
    let bestRating = target?.rating ?? seedRatingFromSkillLevel(bestSkill)
    for (const a of aliases) {
      const aSkill = migrateSkillLevel(a.skillLevel)
      const aMatches = a.matchesRated ?? 0
      const aRating = a.rating ?? seedRatingFromSkillLevel(aSkill)
      if (isHigherSkill(aSkill, bestSkill)) bestSkill = aSkill
      if (aMatches > bestMatches) bestMatches = aMatches
      if (aRating > bestRating) bestRating = aRating
    }
    if (bestMatches === 0) {
      bestRating = seedRatingFromSkillLevel(bestSkill)
    }

    const mergedGender = resolveMergeGender(target, aliases, merge.gender)
    // Giữ tên đã đổi trên hồ sơ chuẩn; chỉ dùng merge.to khi tạo mới.
    const displayName = target?.name ?? merge.to

    const removeIds = new Set(aliases.map((a) => a.id))
    if (target) removeIds.delete(target.id)
    if (removeIds.size > 0) {
      next = next.filter((p) => !removeIds.has(p.id))
      changed = true
    }

    if (target) {
      const nextPlayer = normalizeClubPlayer({
        ...target,
        name: displayName,
        gender: mergedGender,
        skillLevel: bestSkill,
        rating: bestRating,
        matchesRated: bestMatches,
      })
      if (
        nextPlayer.gender !== target.gender ||
        nextPlayer.skillLevel !== target.skillLevel ||
        nextPlayer.rating !== target.rating ||
        nextPlayer.matchesRated !== target.matchesRated ||
        nextPlayer.name !== target.name
      ) {
        next = next.map((p) => (p.id === target.id ? nextPlayer : p))
        changed = true
      }
    } else {
      next.push(
        normalizeClubPlayer({
          id: canonicalId,
          name: merge.to,
          gender: mergedGender,
          skillLevel: bestSkill,
          rating: bestRating,
          matchesRated: bestMatches,
        }),
      )
      changed = true
    }
  }

  return { players: next.map(normalizeClubPlayer), changed }
}

/** Sửa thành viên nữ đã biết nếu đang bị gắn nhầm gender male. */
function applyKnownFemaleGenders(players: ClubPlayer[]): {
  players: ClubPlayer[]
  changed: boolean
} {
  let changed = false
  const next = players.map((player) => {
    if (!KNOWN_FEMALE_NAME_KEYS.has(normalizeParticipantName(player.name))) {
      return player
    }
    if (player.gender === 'female') return player
    changed = true
    return normalizeClubPlayer({ ...player, gender: 'female' })
  })
  return { players: next, changed }
}

/** Map tên cũ → tên chuẩn hiện tại trên club (hoặc merge.to nếu chưa có hồ sơ). */
export function resolveCanonicalPlayerName(name: string): string {
  const key = normalizeParticipantName(name)
  for (const merge of KNOWN_NAME_MERGES) {
    const isAlias = merge.from.some((n) => normalizeParticipantName(n) === key)
    const isCanonical = normalizeParticipantName(merge.to) === key
    if (!isAlias && !isCanonical) continue

    // Đọc thẳng storage để tránh vòng lặp getClubPlayers → merge.
    const stored = readStoredPlayers()
    if (stored) {
      const canonicalId = buildClubPlayerId(merge.to)
      const current =
        stored.find((p) => p.id === canonicalId) ??
        stored.find((p) => normalizeParticipantName(p.name) === normalizeParticipantName(merge.to))
      if (current?.name) return current.name.trim()
    }
    return merge.to
  }
  return name.trim()
}

let cachedPlayers: ClubPlayer[] | null = null
let storageListenerBound = false

function invalidateClubPlayersCache() {
  cachedPlayers = null
}

function bindClubPlayersStorageListener() {
  if (storageListenerBound || typeof window === 'undefined') return
  storageListenerBound = true
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) invalidateClubPlayersCache()
  })
}

function notifyClubPlayersChanged() {
  window.dispatchEvent(new Event('club-players-changed'))
}

function readStoredPlayers(): ClubPlayer[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    return parsed
      .filter(
        (item): item is ClubPlayer =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as ClubPlayer).id === 'string' &&
          typeof (item as ClubPlayer).name === 'string',
      )
      .map((item) => normalizeClubPlayer(item as ClubPlayer))
      .filter((item) => item.name.length > 0)
  } catch {
    return null
  }
}

function writeStoredPlayers(players: ClubPlayer[]) {
  cachedPlayers = players
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players))
  notifyClubPlayersChanged()
}

/**
 * Ghi đè danh sách local từ Firestore (nguồn Elo / A–B dùng chung).
 * Vẫn chạy migrate merge tên để gộp alias nếu còn sót.
 */
export function replaceClubPlayersFromRemote(players: ClubPlayer[]): void {
  const normalized = players.map(normalizeClubPlayer).filter((p) => p.name.length > 0)
  const { players: merged } = applyKnownNameMerges(normalized)
  const { players: withFemales } = applyKnownFemaleGenders(merged)
  writeStoredPlayers(withFemales)
}

export function buildClubPlayerId(name: string): string {
  const base = normalizeParticipantName(name).replace(/\s+/g, '-')
  return base || crypto.randomUUID()
}

/** Danh sách thành viên CLB (localStorage, seed từ CLUB_PLAYER_NAMES). */
export function getClubPlayers(): ClubPlayer[] {
  bindClubPlayersStorageListener()
  if (cachedPlayers) return cachedPlayers

  const stored = readStoredPlayers()
  if (!stored) {
    const { players: seeded } = applyKnownNameMerges(buildSeedPlayers())
    const { players: withFemales } = applyKnownFemaleGenders(seeded)
    writeStoredPlayers(withFemales)
    return withFemales
  }

  const normalized = stored.map(normalizeClubPlayer)
  const { players: merged, changed: mergeChanged } = applyKnownNameMerges(normalized)
  const { players: withFemales, changed: femaleChanged } = applyKnownFemaleGenders(merged)
  const needsFieldMigration = stored.some(
    (player) =>
      !parseGender(player.gender) ||
      parseSkillLevel(player.skillLevel) === undefined ||
      parseRating(player.rating) === undefined,
  )
  const seedChanged = needsRatingSeedMigration(stored)

  if (needsFieldMigration || mergeChanged || femaleChanged || seedChanged) {
    writeStoredPlayers(withFemales)
  } else {
    cachedPlayers = withFemales
  }
  return withFemales
}

/** @deprecated Dùng getClubPlayers() — giữ tương thích, luôn đọc dữ liệu mới nhất. */
export const CLUB_PLAYERS: ClubPlayer[] = buildSeedPlayers()

export function findClubPlayerById(id: string, players = getClubPlayers()): ClubPlayer | undefined {
  return players.find((player) => player.id === id)
}

export function findClubPlayerByName(
  name: string,
  players = getClubPlayers(),
): ClubPlayer | undefined {
  const canonical = resolveCanonicalPlayerName(name)
  const key = normalizeParticipantName(canonical)
  const byName = players.find((player) => normalizeParticipantName(player.name) === key)
  if (byName) return byName

  // Hồ sơ đã đổi tên hiển thị nhưng vẫn giữ id seed từ tên chuẩn (VD Tùng → tên mới).
  for (const merge of KNOWN_NAME_MERGES) {
    const mergeKey = normalizeParticipantName(merge.to)
    const isRelated =
      key === mergeKey ||
      merge.from.some((n) => normalizeParticipantName(n) === normalizeParticipantName(name))
    if (!isRelated) continue
    const seedId = buildClubPlayerId(merge.to)
    const byId = players.find((player) => player.id === seedId)
    if (byId) return byId
  }

  return undefined
}

export function filterClubPlayers(query: string, players = getClubPlayers()): ClubPlayer[] {
  const normalized = normalizeParticipantName(query)
  if (!normalized) return players
  return players.filter((player) =>
    normalizeParticipantName(player.name).includes(normalized),
  )
}

export function addClubPlayer(
  name: string,
  gender?: ClubPlayerGender,
  skillLevel?: SkillLevel,
): { player: ClubPlayer } | { error: string } {
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Tên không được để trống.' }

  const players = getClubPlayers()
  const normalized = normalizeParticipantName(trimmed)
  if (players.some((player) => normalizeParticipantName(player.name) === normalized)) {
    return { error: 'Thành viên đã tồn tại.' }
  }

  let id = buildClubPlayerId(trimmed)
  if (players.some((player) => player.id === id)) {
    id = `${id}-${crypto.randomUUID().slice(0, 8)}`
  }

  const resolvedSkill = resolveSkillLevel(skillLevel)
  const player = normalizeClubPlayer({
    id,
    name: trimmed,
    gender: resolveGender(gender),
    skillLevel: resolvedSkill,
    rating: seedRatingFromSkillLevel(resolvedSkill),
    matchesRated: 0,
  })
  writeStoredPlayers([...players, player])
  return { player }
}

export function updateClubPlayer(
  id: string,
  input: {
    name: string
    gender?: ClubPlayerGender
    skillLevel?: SkillLevel
  },
): { player: ClubPlayer } | { error: string } {
  const trimmed = input.name.trim()
  if (!trimmed) return { error: 'Tên không được để trống.' }

  const players = getClubPlayers()
  const index = players.findIndex((player) => player.id === id)
  if (index === -1) return { error: 'Không tìm thấy thành viên.' }

  const normalized = normalizeParticipantName(trimmed)
  if (
    players.some(
      (player) => player.id !== id && normalizeParticipantName(player.name) === normalized,
    )
  ) {
    return { error: 'Tên đã được dùng bởi thành viên khác.' }
  }

  const current = players[index]!
  const nextSkill = resolveSkillLevel(input.skillLevel ?? current.skillLevel)
  const matchesRated = current.matchesRated ?? 0
  // Chỉ seed lại Elo khi đổi rank mà chưa có trận rated — không ghi đè Elo đã chơi.
  const rating =
    matchesRated === 0
      ? seedRatingFromSkillLevel(nextSkill)
      : (current.rating ?? seedRatingFromSkillLevel(nextSkill))
  const updated = normalizeClubPlayer({
    ...current,
    id: current.id,
    name: trimmed,
    gender: resolveGender(input.gender ?? current.gender),
    skillLevel: nextSkill,
    rating,
    matchesRated,
  })

  const next = [...players]
  next[index] = updated
  writeStoredPlayers(next)
  return { player: updated }
}

/** Ghi đè rating / skillLevel / matchesRated từ kết quả Elo (giữ tên + gender). */
export function applyClubPlayerRatingUpdates(
  updates: Array<{
    id?: string
    name: string
    rating: number
    matchesRated: number
    skillLevel: SkillLevel
  }>,
): number {
  if (updates.length === 0) return 0

  const players = getClubPlayers()
  const byId = new Map(players.map((p) => [p.id, p]))
  const byName = new Map(
    players.map((p) => [normalizeParticipantName(p.name), p]),
  )

  let changed = 0
  const next = players.map((player) => {
    const update =
      updates.find((u) => u.id && u.id === player.id) ??
      updates.find((u) => normalizeParticipantName(u.name) === normalizeParticipantName(player.name))
    if (!update) return player

    const rating = Math.round(update.rating)
    const matchesRated = update.matchesRated
    const skillLevel = update.skillLevel
    if (
      player.rating === rating &&
      player.matchesRated === matchesRated &&
      player.skillLevel === skillLevel
    ) {
      return player
    }
    changed++
    return normalizeClubPlayer({
      ...player,
      rating,
      matchesRated,
      skillLevel,
    })
  })

  // Tạo club player mới nếu có người chơi event chưa có trong danh sách
  for (const update of updates) {
    const key = normalizeParticipantName(update.name)
    if (byId.has(update.id ?? '') || byName.has(key)) continue
    if (!key) continue
    let id = update.id || buildClubPlayerId(update.name)
    if (next.some((p) => p.id === id)) {
      id = `${id}-${crypto.randomUUID().slice(0, 8)}`
    }
    next.push(
      normalizeClubPlayer({
        id,
        name: update.name.trim(),
        gender: seedGenderForName(update.name),
        skillLevel: update.skillLevel,
        rating: Math.round(update.rating),
        matchesRated: update.matchesRated,
      }),
    )
    changed++
  }

  if (changed > 0) {
    writeStoredPlayers(next)
  }
  return changed
}

export function removeClubPlayer(id: string): void {
  const players = getClubPlayers().filter((player) => player.id !== id)
  writeStoredPlayers(players)
}

export function getPlayerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase()
  }
  return name.trim().slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = [
  'bg-emerald-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-orange-500',
] as const

export function getPlayerAvatarColor(name: string): (typeof AVATAR_COLORS)[number] {
  let hash = 0
  for (const char of normalizeParticipantName(name)) {
    hash = (hash + char.charCodeAt(0)) % AVATAR_COLORS.length
  }
  return AVATAR_COLORS[hash]!
}

export function getClubPlayerRating(player: ClubPlayer | undefined): number {
  if (!player) return seedRatingFromSkillLevel(DEFAULT_CLUB_PLAYER_SKILL_LEVEL)
  return resolveRating(player.rating, player.skillLevel)
}

export function getClubPlayerSkillLevel(player: ClubPlayer | undefined): SkillLevel {
  return resolveSkillLevel(player?.skillLevel)
}
