import type { WeeklyShowmatchItem } from '../../lib/showmatch'
import { cn } from '../../lib/cn'
import { formatCountdown } from './showmatchWeekUtils'

interface ShowmatchWeekInsightProps {
  upcoming: WeeklyShowmatchItem[]
  total: number
  finishedCount: number
  nowMs: number
  compact?: boolean
}

export function ShowmatchWeekInsight({
  upcoming,
  total,
  finishedCount,
  nowMs,
  compact = false,
}: ShowmatchWeekInsightProps) {
  const nextMatch = upcoming[0]
  const nextMs = nextMatch?.match.scheduledAt
    ? new Date(nextMatch.match.scheduledAt).getTime()
    : null
  const hasCountdown = nextMs && nextMs > nowMs

  return (
    <aside
      className={cn(
        'flex items-stretch justify-between gap-3 rounded-2xl bg-white/70 ring-1 ring-neutral-200/60 backdrop-blur-md',
        compact ? 'p-2.5' : 'gap-4 p-4',
      )}
    >
      {hasCountdown ? (
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'font-semibold uppercase tracking-widest text-text-secondary',
              compact ? 'text-[9px]' : 'text-[11px]',
            )}
          >
            Trận tiếp theo
          </p>
          <p
            className={cn(
              'mt-0.5 font-semibold leading-tight tracking-tight text-text-primary',
              compact ? 'text-sm' : 'text-2xl',
            )}
            aria-live="polite"
          >
            {formatCountdown(nextMs, nowMs)}
          </p>
          {!compact && (
            <p className="mt-1 truncate text-sm text-text-secondary">
              {nextMatch.match.name ?? 'Showmatch'}
            </p>
          )}
        </div>
      ) : (
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'font-semibold uppercase tracking-widest text-text-secondary',
              compact ? 'text-[9px]' : 'text-[11px]',
            )}
          >
            Tổng trận
          </p>
          <p
            className={cn(
              'mt-0.5 font-semibold tracking-tight text-text-primary',
              compact ? 'text-lg' : 'text-2xl',
            )}
          >
            {total}
          </p>
          {!compact && (
            <p className="mt-0.5 text-sm text-text-secondary">showmatch tuần này</p>
          )}
        </div>
      )}

      {total > 0 && (
        <div
          className={cn(
            'flex shrink-0 flex-col items-end justify-center border-l border-neutral-200/70 text-right',
            compact ? 'pl-2' : 'pl-4',
          )}
        >
          <p
            className={cn(
              'font-semibold uppercase tracking-widest text-text-secondary',
              compact ? 'text-[9px]' : 'text-[11px]',
            )}
          >
            KQ
          </p>
          <p
            className={cn(
              'mt-0.5 font-semibold tabular-nums text-text-primary',
              compact ? 'text-sm' : 'text-xl',
            )}
          >
            {finishedCount}
            <span className={cn('font-medium text-text-secondary', compact ? 'text-xs' : 'text-base')}>
              {' '}
              / {total}
            </span>
          </p>
        </div>
      )}
    </aside>
  )
}
