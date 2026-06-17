import { getWeekRange } from '../../lib/showmatch'
import { getShowmatchGamesWon } from '../../lib/showmatchScoring'
import type { WeeklyShowmatchItem } from '../../lib/showmatch'

export type MatchStatus = 'upcoming' | 'live' | 'finished' | 'pending'

export type WeekStatus = 'current' | 'next' | 'completed' | 'upcoming'

const LIVE_WINDOW_MS = 3 * 60 * 60 * 1000

export function stripSkillLevel(label: string): string {
  return label.replace(/\s*\([12]\)/g, '')
}

export function formatTeamLabel(pairLabel: string): string {
  return stripSkillLevel(pairLabel)
    .split(' & ')
    .map((name) => name.trim())
    .filter(Boolean)
    .join(' & ')
}

export function formatMatchTime(iso: string): string {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
}

export function formatMatchDate(iso: string): string {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(parsed.getDate())}/${pad(parsed.getMonth() + 1)}`
}

export function getWeekStatus(
  weekStart: Date,
  isCurrentWeek: boolean,
  isNextWeek: boolean,
  nowMs: number,
): WeekStatus {
  if (isCurrentWeek) return 'current'
  if (isNextWeek) return 'next'
  const { end } = getWeekRange(weekStart)
  if (end.getTime() < nowMs) return 'completed'
  return 'upcoming'
}

export function getMatchStatus(item: WeeklyShowmatchItem, nowMs: number): MatchStatus {
  if (item.match.completed) return 'finished'
  const scheduledMs = item.match.scheduledAt
    ? new Date(item.match.scheduledAt).getTime()
    : null
  if (!scheduledMs) return 'upcoming'
  if (scheduledMs > nowMs) return 'upcoming'
  if (nowMs - scheduledMs <= LIVE_WINDOW_MS) return 'live'
  return 'pending'
}

export function partitionWeekMatches(items: WeeklyShowmatchItem[], nowMs: number) {
  const upcoming: WeeklyShowmatchItem[] = []
  const played: WeeklyShowmatchItem[] = []

  for (const item of items) {
    const status = getMatchStatus(item, nowMs)
    if (status === 'upcoming' || status === 'live') {
      upcoming.push(item)
    } else {
      played.push(item)
    }
  }

  const byTime = (a: WeeklyShowmatchItem, b: WeeklyShowmatchItem) =>
    new Date(a.match.scheduledAt!).getTime() - new Date(b.match.scheduledAt!).getTime()

  return {
    upcoming: upcoming.sort(byTime),
    played: played.sort(byTime),
    total: items.length,
    upcomingCount: upcoming.length,
    finishedCount: played.length,
  }
}

export function getMatchScore(item: WeeklyShowmatchItem): string | null {
  const gamesWon = getShowmatchGamesWon(item.match)
  if (!gamesWon) return null
  return `${gamesWon.score1} – ${gamesWon.score2}`
}

export function formatCountdown(targetMs: number, nowMs: number): string {
  const diff = Math.max(0, targetMs - nowMs)
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000))

  if (days > 0) return `${days} ngày ${hours} giờ`
  if (hours > 0) return `${hours} giờ ${minutes} phút`
  if (minutes > 0) return `${minutes} phút`
  return 'Sắp bắt đầu'
}
