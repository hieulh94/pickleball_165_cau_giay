import { CLUB_PLAYERS } from './clubPlayers'
import { getWeekNumber, isScheduledInWeek } from './showmatch'
import { normalizeParticipantName } from './showmatchParticipants'
import type { PickleballEvent } from '../types'

export interface DashboardTrends {
  eventsThisMonth: number
  membersThisMonth: number
  matchesThisWeek: number
}

export interface DashboardStats {
  eventCount: number
  memberCount: number
  matchCount: number
  currentWeek: number
  trends: DashboardTrends
}

function isInCurrentMonth(iso: string, now = new Date()): boolean {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return false
  return (
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
  )
}

export function computeDashboardStats(events: PickleballEvent[], now = new Date()): DashboardStats {
  const memberNames = new Set<string>()
  const membersThisMonth = new Set<string>()

  for (const player of CLUB_PLAYERS) {
    memberNames.add(normalizeParticipantName(player.name))
  }

  let matchCount = 0
  let matchesThisWeek = 0
  let eventsThisMonth = 0

  for (const event of events) {
    if (isInCurrentMonth(event.createdAt, now)) {
      eventsThisMonth += 1
      for (const participant of event.participants) {
        membersThisMonth.add(normalizeParticipantName(participant.name))
      }
    }

    matchCount += event.matches.length
    for (const participant of event.participants) {
      memberNames.add(normalizeParticipantName(participant.name))
    }
    for (const match of event.matches) {
      if (match.scheduledAt && isScheduledInWeek(match.scheduledAt, now)) {
        matchesThisWeek += 1
      }
    }
  }

  return {
    eventCount: events.length,
    memberCount: memberNames.size,
    matchCount,
    currentWeek: getWeekNumber(now),
    trends: {
      eventsThisMonth,
      membersThisMonth: membersThisMonth.size,
      matchesThisWeek,
    },
  }
}

/** Label for KPI trend line */
export function formatTrendLabel(
  key: 'events' | 'members' | 'matches' | 'week',
  trends: DashboardTrends,
): string {
  switch (key) {
    case 'events':
      return trends.eventsThisMonth > 0
        ? `+${trends.eventsThisMonth} tháng này`
        : 'Không có mới tháng này'
    case 'members':
      return trends.membersThisMonth > 0
        ? `+${trends.membersThisMonth} tháng này`
        : 'Ổn định'
    case 'matches':
      return trends.matchesThisWeek > 0
        ? `+${trends.matchesThisWeek} tuần này`
        : 'Chưa có tuần này'
    case 'week':
      return 'Đang diễn ra'
    default:
      return ''
  }
}
