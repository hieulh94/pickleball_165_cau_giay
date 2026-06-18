import { normalizeParticipantName } from './showmatchParticipants'

export interface ClubPlayer {
  id: string
  name: string
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
  'Dohongcuong',
  'Le Ha Chi',
  'Đinh Huy',
  'Đức Công Act',
  'Dương Gà',
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

function buildSeedPlayers(): ClubPlayer[] {
  return CLUB_PLAYER_NAMES.map((name) => ({
    id: buildClubPlayerId(name),
    name,
  }))
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
      .map((item) => ({ id: item.id, name: item.name.trim() }))
      .filter((item) => item.name.length > 0)
  } catch {
    return null
  }
}

function writeStoredPlayers(players: ClubPlayer[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players))
  notifyClubPlayersChanged()
}

export function buildClubPlayerId(name: string): string {
  const base = normalizeParticipantName(name).replace(/\s+/g, '-')
  return base || crypto.randomUUID()
}

/** Danh sách thành viên CLB (localStorage, seed từ CLUB_PLAYER_NAMES). */
export function getClubPlayers(): ClubPlayer[] {
  return readStoredPlayers() ?? buildSeedPlayers()
}

/** @deprecated Dùng getClubPlayers() — giữ tương thích, luôn đọc dữ liệu mới nhất. */
export const CLUB_PLAYERS: ClubPlayer[] = buildSeedPlayers()

export function filterClubPlayers(query: string, players = getClubPlayers()): ClubPlayer[] {
  const normalized = normalizeParticipantName(query)
  if (!normalized) return players
  return players.filter((player) =>
    normalizeParticipantName(player.name).includes(normalized),
  )
}

export function addClubPlayer(name: string): { player: ClubPlayer } | { error: string } {
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

  const player: ClubPlayer = { id, name: trimmed }
  writeStoredPlayers([...players, player])
  return { player }
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
