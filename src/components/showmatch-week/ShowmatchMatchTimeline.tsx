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

function StatusIcon({ status }: { status: MatchStatus }) {
  if (status === 'finished') {
    return (
      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
        <path
          fillRule="evenodd"
          d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
          clipRule="evenodd"
        />
      </svg>
    )
  }
  if (status === 'live') {
    return <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
  }
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path
        fillRule="evenodd"
        d="M8 1.75a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 1.75ZM8 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm0-9.5A6.5 6.5 0 1 0 14.5 8 6.507 6.507 0 0 0 8 2.5Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

interface ShowmatchMatchTimelineProps {
  items: WeeklyShowmatchItem[]
  nowMs: number
  onSelectMatch: (item: WeeklyShowmatchItem) => void
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
  isNextUpcoming: boolean
  onOpen: () => void
}

function TimelineRow({ item, nowMs, isLast, isNextUpcoming, onOpen }: TimelineRowProps) {
  const status = getMatchStatus(item, nowMs)
  const isFinished = status === 'finished'
  const isUpcoming = status === 'upcoming' || status === 'live'
  const team1 = formatTeamLabel(item.pair1Label) || '—'
  const team2 = formatTeamLabel(item.pair2Label) || '—'
  const score = getMatchScore(item)
  const scheduled = item.match.scheduledAt

  return (
    <li className="relative flex gap-4 sm:gap-6">
      <div
        className={cn(
          'flex w-14 shrink-0 flex-col items-end pt-2 sm:w-16',
          isFinished && 'opacity-60',
        )}
      >
        <p
          className={cn(
            'text-base font-semibold tabular-nums sm:text-lg',
            isFinished ? 'text-neutral-400' : 'text-primary-700',
          )}
        >
          {scheduled ? formatMatchTime(scheduled) : '—'}
        </p>
        <p className="mt-0.5 text-xs text-neutral-400">
          {scheduled ? formatMatchDate(scheduled) : '—'}
        </p>
      </div>

      <div className="relative flex flex-col items-center">
        <span
          className={cn(
            'z-10 mt-2.5 flex shrink-0 items-center justify-center rounded-full',
            isFinished && 'h-4 w-4 bg-neutral-300 text-neutral-600',
            status === 'upcoming' && 'h-4 w-4 bg-primary-600 ring-4 ring-primary-100',
            status === 'live' && 'h-4 w-4 bg-emerald-500 ring-4 ring-emerald-100 animate-pulse',
            status === 'pending' && 'h-4 w-4 bg-amber-400 ring-4 ring-amber-100',
            isFinished && 'text-white',
          )}
          aria-hidden
        >
          {isFinished && (
            <svg viewBox="0 0 12 12" fill="currentColor" className="h-2.5 w-2.5">
              <path d="M10.28 2.28a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L1.72 4.53a.75.75 0 1 1 1.06-1.06l2.47 2.47 3.72-3.72a.75.75 0 0 1 1.06 0Z" />
            </svg>
          )}
        </span>
        {!isLast && (
          <div
            className={cn('mt-1 w-0.5 flex-1', isFinished ? 'bg-neutral-200' : 'bg-primary-100')}
            aria-hidden
          />
        )}
      </div>

      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'showmatch-match-enter mb-6 min-w-0 flex-1 rounded-2xl p-4 text-left transition duration-200',
          'active:scale-[0.99]',
          isFinished &&
            'border border-neutral-200 bg-neutral-50/90 hover:bg-neutral-100/90',
          isUpcoming &&
            'border-2 border-primary-200 bg-white shadow-[0_4px_20px_rgba(124,58,237,0.1)] hover:border-primary-300 hover:shadow-[0_6px_24px_rgba(124,58,237,0.14)]',
          status === 'live' &&
            'border-emerald-300 bg-emerald-50/40 shadow-[0_4px_20px_rgba(16,185,129,0.12)]',
          status === 'pending' &&
            'border-2 border-amber-200 bg-amber-50/30 shadow-[0_4px_16px_rgba(245,158,11,0.1)]',
          isNextUpcoming && status === 'upcoming' && 'ring-2 ring-primary-300/50',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <p
            className={cn(
              'truncate text-sm',
              isFinished ? 'text-neutral-400' : 'text-text-secondary',
            )}
          >
            {item.match.name ?? item.eventName}
          </p>
          <span
            className={cn(
              'flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold',
              isFinished && 'bg-neutral-200 text-neutral-600',
              status === 'upcoming' && 'bg-primary-600 text-white',
              status === 'live' && 'bg-emerald-600 text-white',
              status === 'pending' && 'bg-amber-500 text-white',
            )}
          >
            <StatusIcon status={status} />
            {STATUS_LABEL[status]}
          </span>
        </div>

        {isNextUpcoming && status === 'upcoming' && (
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-primary-600">
            Trận tiếp theo
          </p>
        )}

        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <p
            className={cn(
              'line-clamp-2 text-right text-sm font-medium leading-snug sm:text-base',
              isFinished ? 'text-neutral-500' : 'text-text-primary',
            )}
          >
            {team1}
          </p>
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[9px] font-bold tracking-wider',
              isFinished
                ? 'bg-neutral-200 text-neutral-400'
                : 'bg-primary-50 text-primary-600',
            )}
          >
            VS
          </span>
          <p
            className={cn(
              'line-clamp-2 text-left text-sm font-medium leading-snug sm:text-base',
              isFinished ? 'text-neutral-500' : 'text-text-primary',
            )}
          >
            {team2}
          </p>
        </div>

        {isFinished && score && (
          <div className="mt-3 flex justify-center">
            <span className="rounded-xl bg-neutral-200/70 px-4 py-1.5 text-lg font-bold tabular-nums text-neutral-700">
              {score}
            </span>
          </div>
        )}

        {status === 'upcoming' && (
          <p className="mt-3 text-center text-xs font-medium text-primary-600/80">
            Nhấn để xem chi tiết
          </p>
        )}

        {status === 'pending' && (
          <p className="mt-3 text-center text-sm font-medium text-amber-700">Chưa nhập kết quả</p>
        )}
      </button>
    </li>
  )
}

export function ShowmatchMatchTimeline({ items, nowMs, onSelectMatch }: ShowmatchMatchTimelineProps) {
  const sorted = sortBySchedule(items)

  if (sorted.length === 0) return null

  const nextUpcomingId = sorted.find(
    (item) => getMatchStatus(item, nowMs) === 'upcoming',
  )?.match.id

  return (
    <ol className="mt-2 list-none" aria-label="Lịch trận theo thời gian">
      {sorted.map((item, index) => (
        <TimelineRow
          key={item.match.id}
          item={item}
          nowMs={nowMs}
          isLast={index === sorted.length - 1}
          isNextUpcoming={item.match.id === nextUpcomingId}
          onOpen={() => onSelectMatch(item)}
        />
      ))}
    </ol>
  )
}
