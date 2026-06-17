import type { WeeklyShowmatchItem } from '../../lib/showmatch'
import { cn } from '../../lib/cn'
import {
  formatMatchDate,
  formatMatchTime,
  formatTeamLabel,
  getMatchScore,
  getMatchStatus,
  type MatchStatus,
} from './showmatchWeekUtils'

const STATUS_LABEL: Record<MatchStatus, string> = {
  upcoming: 'Sắp đấu',
  live: 'Đang đấu',
  finished: 'Đã xong',
  pending: 'Chờ KQ',
}

const DOT_COLOR: Record<MatchStatus, string> = {
  upcoming: 'bg-white ring-2 ring-primary-500',
  live: 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.2)]',
  finished: 'bg-neutral-400',
  pending: 'bg-amber-400',
}

const STATUS_COLOR: Record<MatchStatus, string> = {
  upcoming: 'text-primary-600',
  live: 'text-emerald-600',
  finished: 'text-text-secondary',
  pending: 'text-amber-600',
}

interface ShowmatchMatchTimelineProps {
  items: WeeklyShowmatchItem[]
  nowMs: number
  onOpenMatch: (eventId: string) => void
}

function sortBySchedule(items: WeeklyShowmatchItem[]): WeeklyShowmatchItem[] {
  return [...items].sort((a, b) => {
    const aMs = a.match.scheduledAt ? new Date(a.match.scheduledAt).getTime() : 0
    const bMs = b.match.scheduledAt ? new Date(b.match.scheduledAt).getTime() : 0
    return aMs - bMs
  })
}

interface TimelineRowProps {
  item: WeeklyShowmatchItem
  nowMs: number
  isLast: boolean
  onOpen: () => void
}

function TimelineRow({ item, nowMs, isLast, onOpen }: TimelineRowProps) {
  const status = getMatchStatus(item, nowMs)
  const team1 = formatTeamLabel(item.pair1Label) || '—'
  const team2 = formatTeamLabel(item.pair2Label) || '—'
  const score = getMatchScore(item)
  const scheduled = item.match.scheduledAt

  return (
    <li className="relative flex gap-4 sm:gap-6">
      <div className="flex w-14 shrink-0 flex-col items-end pt-1 sm:w-16">
        <p className="text-base font-semibold tabular-nums text-text-primary sm:text-lg">
          {scheduled ? formatMatchTime(scheduled) : '—'}
        </p>
        <p className="mt-0.5 text-xs text-text-secondary">
          {scheduled ? formatMatchDate(scheduled) : '—'}
        </p>
      </div>

      <div className="relative flex flex-col items-center">
        <span
          className={cn(
            'z-10 mt-2 block h-3 w-3 shrink-0 rounded-full',
            DOT_COLOR[status],
            status === 'live' && 'animate-pulse',
          )}
          aria-hidden
        />
        {!isLast && <div className="mt-1 w-px flex-1 bg-neutral-200" aria-hidden />}
      </div>

      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'showmatch-match-enter mb-6 min-w-0 flex-1 rounded-2xl bg-white/80 p-4 text-left ring-1 ring-neutral-200/70 transition duration-200',
          'hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] active:scale-[0.99]',
          status === 'live' && 'bg-emerald-50/50 ring-emerald-200/60',
          status === 'upcoming' && 'ring-primary-200/50',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-sm text-text-secondary">
            {item.match.name ?? item.eventName}
          </p>
          <span className={cn('shrink-0 text-xs font-semibold', STATUS_COLOR[status])}>
            {STATUS_LABEL[status]}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <p className="line-clamp-2 text-right text-sm font-medium leading-snug text-text-primary sm:text-base">
            {team1}
          </p>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[9px] font-bold tracking-wider text-neutral-500">
            VS
          </span>
          <p className="line-clamp-2 text-left text-sm font-medium leading-snug text-text-primary sm:text-base">
            {team2}
          </p>
        </div>

        {status === 'finished' && score && (
          <p className="mt-3 text-center text-xl font-semibold tabular-nums text-text-primary">
            {score}
          </p>
        )}

        {status === 'pending' && (
          <p className="mt-3 text-center text-sm text-text-secondary">Chưa nhập kết quả</p>
        )}
      </button>
    </li>
  )
}

export function ShowmatchMatchTimeline({ items, nowMs, onOpenMatch }: ShowmatchMatchTimelineProps) {
  const sorted = sortBySchedule(items)

  if (sorted.length === 0) return null

  return (
    <ol className="mt-2 list-none" aria-label="Lịch trận theo thời gian">
      {sorted.map((item, index) => (
        <TimelineRow
          key={item.match.id}
          item={item}
          nowMs={nowMs}
          isLast={index === sorted.length - 1}
          onOpen={() => onOpenMatch(item.eventId)}
        />
      ))}
    </ol>
  )
}
