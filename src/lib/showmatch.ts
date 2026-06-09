import { getPairLabel } from './pairing'
import type { Match, PickleballEvent } from '../types'

export function getWeekNumber(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function getDefaultShowmatchName(date: Date = new Date()): string {
  return `Showmatch tuần ${getWeekNumber(date)}`
}

export function getWeekRange(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const day = start.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + diffToMonday)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

export function isScheduledInWeek(iso: string, date: Date = new Date()): boolean {
  const scheduled = new Date(iso)
  if (Number.isNaN(scheduled.getTime())) return false
  const { start, end } = getWeekRange(date)
  const time = scheduled.getTime()
  return time >= start.getTime() && time <= end.getTime()
}

export function formatWeekRangeLabel(date: Date = new Date()): string {
  const { start, end } = getWeekRange(date)
  const fmt = (d: Date) =>
    d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

export interface WeeklyShowmatchItem {
  eventId: string
  eventName: string
  match: Match
  pair1Label: string
  pair2Label: string
}

export function addWeeks(date: Date, weeks: number): Date {
  const { start } = getWeekRange(date)
  const result = new Date(start)
  result.setDate(result.getDate() + weeks * 7)
  return result
}

export function getWeekStartKey(date: Date): string {
  const { start } = getWeekRange(date)
  const year = start.getFullYear()
  const month = String(start.getMonth() + 1).padStart(2, '0')
  const day = String(start.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseWeekStartKey(key: string): Date {
  return new Date(`${key}T12:00:00`)
}

export interface ShowmatchWeekSlide {
  weekStart: Date
  weekNumber: number
  weekLabel: string
  items: WeeklyShowmatchItem[]
  isCurrentWeek: boolean
  isNextWeek: boolean
}

export function buildShowmatchWeekSlides(events: PickleballEvent[]): ShowmatchWeekSlide[] {
  const now = new Date()
  const currentKey = getWeekStartKey(now)
  const nextKey = getWeekStartKey(addWeeks(now, 1))
  const weekKeys = new Set<string>([currentKey, nextKey])

  for (const event of events) {
    if (event.eventType !== 'showmatch') continue
    for (const match of event.matches) {
      if (match.phase !== 'showmatch' || !match.scheduledAt) continue
      weekKeys.add(getWeekStartKey(new Date(match.scheduledAt)))
    }
  }

  const hasShowmatchEvents = events.some((event) => event.eventType === 'showmatch')
  const hasScheduledShowmatches = events.some((event) =>
    event.matches.some((match) => match.phase === 'showmatch' && match.scheduledAt),
  )

  if (!hasShowmatchEvents && !hasScheduledShowmatches) return []

  const sortedKeys = [...weekKeys].sort()
  const rangeStart = getWeekRange(parseWeekStartKey(sortedKeys[0])).start
  const rangeEnd = getWeekRange(
    parseWeekStartKey(sortedKeys[sortedKeys.length - 1]),
  ).start

  const slides: ShowmatchWeekSlide[] = []
  const cursor = new Date(rangeStart)
  while (cursor.getTime() <= rangeEnd.getTime()) {
    const weekDate = new Date(cursor)
    const weekKey = getWeekStartKey(weekDate)
    slides.push({
      weekStart: weekDate,
      weekNumber: getWeekNumber(weekDate),
      weekLabel: formatWeekRangeLabel(weekDate),
      items: collectWeeklyShowmatches(events, weekDate),
      isCurrentWeek: weekKey === currentKey,
      isNextWeek: weekKey === nextKey,
    })
    cursor.setDate(cursor.getDate() + 7)
  }

  return slides
}

export function collectWeeklyShowmatches(
  events: PickleballEvent[],
  now: Date = new Date(),
): WeeklyShowmatchItem[] {
  const items: WeeklyShowmatchItem[] = []

  for (const event of events) {
    if (event.eventType !== 'showmatch') continue

    for (const match of event.matches) {
      if (match.phase !== 'showmatch' || !match.scheduledAt) continue
      if (!isScheduledInWeek(match.scheduledAt, now)) continue

      const pair1 = event.pairs.find((p) => p.id === match.pair1Id)
      const pair2 = event.pairs.find((p) => p.id === match.pair2Id)

      items.push({
        eventId: event.id,
        eventName: event.name,
        match,
        pair1Label: pair1 ? getPairLabel(pair1, event.participants) : '—',
        pair2Label: pair2 ? getPairLabel(pair2, event.participants) : '—',
      })
    }
  }

  return items.sort(
    (a, b) =>
      new Date(a.match.scheduledAt!).getTime() - new Date(b.match.scheduledAt!).getTime(),
  )
}

export function toScheduledISO(date: string, time: string): string | null {
  if (!date || !time) return null
  const parsed = new Date(`${date}T${time}`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

export function scheduledAtToDateTimeInputs(iso: string | undefined): { date: string; time: string } {
  const fallbackDate = new Date().toISOString().slice(0, 10)
  if (!iso) return { date: fallbackDate, time: '06:00' }

  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return { date: fallbackDate, time: '06:00' }

  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`,
    time: `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`,
  }
}

/** Cho phép sửa tên, lịch, cặp đấu khi chưa nhập kết quả hiệp nào */
export function canEditShowmatchInfo(match: Match): boolean {
  return !match.games || match.games.length === 0
}

export function formatScheduledAt(iso: string): string {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return iso
  return parsed.toLocaleString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function sortShowMatches(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => {
    const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0
    const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0
    return aTime - bTime
  })
}

export function partitionShowMatchesByTime(matches: Match[], now: Date = new Date()) {
  const nowMs = now.getTime()
  const upcoming: Match[] = []
  const past: Match[] = []

  for (const match of sortShowMatches(matches)) {
    const scheduledMs = match.scheduledAt ? new Date(match.scheduledAt).getTime() : 0
    if (scheduledMs >= nowMs && !match.completed) {
      upcoming.push(match)
    } else {
      past.push(match)
    }
  }

  return { upcoming, past }
}

export interface ShowmatchWeekGroup {
  weekKey: string
  weekStart: Date
  weekNumber: number
  weekLabel: string
  matches: Match[]
  isPastWeek: boolean
  isCurrentWeek: boolean
}

export function groupShowMatchesByWeek(
  matches: Match[],
  now: Date = new Date(),
): ShowmatchWeekGroup[] {
  const currentKey = getWeekStartKey(now)
  const groups = new Map<string, Match[]>()
  const noDate: Match[] = []

  for (const match of sortShowMatches(matches)) {
    if (!match.scheduledAt) {
      noDate.push(match)
      continue
    }
    const key = getWeekStartKey(new Date(match.scheduledAt))
    const list = groups.get(key) ?? []
    list.push(match)
    groups.set(key, list)
  }

  const result: ShowmatchWeekGroup[] = [...groups.keys()]
    .sort()
    .map((key) => {
      const weekStart = parseWeekStartKey(key)
      const { end } = getWeekRange(weekStart)
      return {
        weekKey: key,
        weekStart,
        weekNumber: getWeekNumber(weekStart),
        weekLabel: formatWeekRangeLabel(weekStart),
        matches: groups.get(key)!,
        isPastWeek: end.getTime() < now.getTime(),
        isCurrentWeek: key === currentKey,
      }
    })

  if (noDate.length > 0) {
    result.push({
      weekKey: 'no-date',
      weekStart: now,
      weekNumber: 0,
      weekLabel: 'Chưa có ngày',
      matches: noDate,
      isPastWeek: false,
      isCurrentWeek: false,
    })
  }

  return result
}
