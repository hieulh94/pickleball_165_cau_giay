import {
  buildPlayerContributionStats,
  type ContributionStanding,
  type PlayerContributionStats,
} from './contributionStandings'
import type { PickleballEvent } from '../types'

export type LeaderboardPeriod = 'today' | 'week' | 'month' | 'all'
export type LeaderboardMetric = 'earnings' | 'wins' | 'matches' | 'contribution'

export interface LeaderboardStanding extends ContributionStanding {
  trend: number | null
}

export interface LeaderboardOptions {
  period: LeaderboardPeriod
  metric: LeaderboardMetric
  now?: Date
}

interface DateRange {
  start: Date
  end: Date
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

export function getPeriodRange(period: LeaderboardPeriod, now = new Date()): DateRange | null {
  switch (period) {
    case 'all':
      return null
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) }
    case 'week':
      return {
        start: startOfWeek(now),
        end: endOfDay(new Date(startOfWeek(now).getTime() + 6 * 24 * 60 * 60 * 1000)),
      }
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) }
  }
}

export function getPreviousPeriodRange(
  period: LeaderboardPeriod,
  now = new Date(),
): DateRange | null {
  switch (period) {
    case 'all': {
      const thisMonth = startOfMonth(now)
      const prevMonthEnd = new Date(thisMonth.getTime() - 1)
      return { start: startOfMonth(prevMonthEnd), end: endOfMonth(prevMonthEnd) }
    }
    case 'today': {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) }
    }
    case 'week': {
      const thisWeekStart = startOfWeek(now)
      const prevWeekEnd = new Date(thisWeekStart.getTime() - 1)
      const prevWeekStart = startOfWeek(prevWeekEnd)
      return {
        start: prevWeekStart,
        end: endOfDay(new Date(prevWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000)),
      }
    }
    case 'month': {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      return { start: startOfMonth(prevMonth), end: endOfMonth(prevMonth) }
    }
  }
}

function filterEventsByRange(
  events: PickleballEvent[],
  range: DateRange | null,
): PickleballEvent[] {
  if (!range) return events
  return events.filter((event) => {
    const created = new Date(event.createdAt)
    if (Number.isNaN(created.getTime())) return false
    return created >= range.start && created <= range.end
  })
}

function metricValue(row: PlayerContributionStats, metric: LeaderboardMetric): number {
  switch (metric) {
    case 'earnings':
      return row.totalAmount
    case 'wins':
      return row.wins
    case 'matches':
      return row.matchesPlayed
    case 'contribution':
      return row.contributionEventIds.size
  }
}

function rowQualifies(row: PlayerContributionStats, metric: LeaderboardMetric): boolean {
  return metricValue(row, metric) > 0
}

function sortRows(
  rows: PlayerContributionStats[],
  metric: LeaderboardMetric,
): Omit<ContributionStanding, 'rank'>[] {
  const sorted = [...rows]
    .filter((row) => rowQualifies(row, metric))
    .sort((a, b) => {
      const diff = metricValue(b, metric) - metricValue(a, metric)
      if (diff !== 0) return diff
      if (b.totalAmount !== a.totalAmount) return b.totalAmount - a.totalAmount
      if (b.wins !== a.wins) return b.wins - a.wins
      return a.displayName.localeCompare(b.displayName, 'vi')
    })

  return sorted.map((row) => ({
    name: row.displayName,
    totalAmount: row.totalAmount,
    eventsContributed: row.contributionEventIds.size,
    matchesPlayed: row.matchesPlayed,
    wins: row.wins,
  }))
}

function getRowMetricValue(
  row: Omit<ContributionStanding, 'rank'>,
  metric: LeaderboardMetric,
): number {
  switch (metric) {
    case 'earnings':
      return row.totalAmount
    case 'wins':
      return row.wins
    case 'matches':
      return row.matchesPlayed
    case 'contribution':
      return row.eventsContributed
  }
}

function assignRanksByMetric(
  rows: Omit<ContributionStanding, 'rank'>[],
  metric: LeaderboardMetric,
): ContributionStanding[] {
  const result: ContributionStanding[] = []
  for (let i = 0; i < rows.length; i++) {
    let rank = i + 1
    if (i > 0) {
      const cur = rows[i]!
      const prev = rows[i - 1]!
      const curVal = getRowMetricValue(cur, metric)
      const prevVal = getRowMetricValue(prev, metric)
      if (curVal === prevVal) {
        rank = result[i - 1]!.rank
      }
    }
    result.push({ ...rows[i]!, rank })
  }
  return result
}

export function getStandingMetricValue(
  row: ContributionStanding,
  metric: LeaderboardMetric,
): number {
  switch (metric) {
    case 'earnings':
      return row.totalAmount
    case 'wins':
      return row.wins
    case 'matches':
      return row.matchesPlayed
    case 'contribution':
      return row.eventsContributed
  }
}

export function calculateLeaderboardStandings(
  events: PickleballEvent[],
  options: LeaderboardOptions,
): LeaderboardStanding[] {
  const now = options.now ?? new Date()
  const range = getPeriodRange(options.period, now)
  const filtered = filterEventsByRange(events, range)
  const stats = buildPlayerContributionStats(filtered)
  const rows = sortRows(stats, options.metric)
  const standings = assignRanksByMetric(rows, options.metric)

  const previousRange = getPreviousPeriodRange(options.period, now)
  const previousFiltered = filterEventsByRange(events, previousRange)
  const previousStats = buildPlayerContributionStats(previousFiltered)
  const previousRows = sortRows(previousStats, options.metric)
  const previousStandings = assignRanksByMetric(previousRows, options.metric)
  const previousRankByName = new Map(previousStandings.map((row) => [row.name, row.rank]))

  return standings.map((row) => {
    const previousRank = previousRankByName.get(row.name)
    const trend =
      previousRank === undefined ? null : previousRank - row.rank
    return { ...row, trend }
  })
}

/** @deprecated Use calculateLeaderboardStandings */
export { calculateContributionStandings } from './contributionStandings'
