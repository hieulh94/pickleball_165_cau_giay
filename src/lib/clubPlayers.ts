import { normalizeParticipantName } from './showmatchParticipants'

export interface ClubPlayer {
  id: string
  name: string
}

const CLUB_PLAYER_NAMES = [
  'NH Đoàn',
  'Bích Ngọc',
  'Cong Pham',
  'Dang Khôi',
  'Dattt',
  'Dohongcuong',
  'Dũng',
  'Duy Anh',
  'Đinh Huy',
  'Đức Công Act',
  'Dương Gà',
  'Giangcv',
  'Hanhtranvti',
  'Hiếu LH',
  'Hoa Ngọc Lan',
  'Hoàng Cúc',
  'Hoàng Long',
  'Kiều Đức Nam',
  'Le Ha Chi',
  'Lĩnh Bonus',
  'Linh Lan',
  'Mạnh Hùng',
  'Nguyên Dk',
  'Nguyen Thach Le',
  'Nguyễn Xuân Tùng',
  'Phung The Anh',
  'Rose Thuy Nhung',
  'Sơn Phạm',
  'Thái Anh',
  'Thanh Huệ',
  'The Anh Andrew',
  'Trần Đại Nghĩa',
  'Trần Tuấn Ngọc',
  'Trần Văn Khanh',
  'Trúc Mai',
  'Tuan Nguyen',
  'Tùng',
  'Việt Mx',
  'Vinh Tran',
  'Vũ Thiên Tân',
] as const

export const CLUB_PLAYERS: ClubPlayer[] = [...CLUB_PLAYER_NAMES]
  .sort((a, b) => a.localeCompare(b, 'vi'))
  .map((name) => ({
    id: normalizeParticipantName(name).replace(/\s+/g, '-'),
    name,
  }))

export function filterClubPlayers(query: string): ClubPlayer[] {
  const normalized = normalizeParticipantName(query)
  if (!normalized) return CLUB_PLAYERS
  return CLUB_PLAYERS.filter((player) =>
    normalizeParticipantName(player.name).includes(normalized),
  )
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
