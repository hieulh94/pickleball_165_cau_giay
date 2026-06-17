import { getShowmatchGamesWon } from '../../lib/showmatchScoring'
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

const STATUS_COLOR: Record<MatchStatus, string> = {
  upcoming: 'text-primary-600',
  live: 'text-emerald-600',
  finished: 'text-text-secondary',
  pending: 'text-amber-600',
}

interface ShowmatchMatchCardProps {
  item: WeeklyShowmatchItem
  nowMs: number
  onClick?: () => void
  compact?: boolean
}

export function ShowmatchMatchCard({ item, nowMs, onClick, compact = false }: ShowmatchMatchCardProps) {
  const status = getMatchStatus(item, nowMs)
  const team1 = formatTeamLabel(item.pair1Label) || '—'
  const team2 = formatTeamLabel(item.pair2Label) || '—'
  const score = getMatchScore(item)
  const scheduled = item.match.scheduledAt

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'showmatch-match-enter group w-full min-w-0 rounded-xl bg-white/60 text-left ring-1 ring-neutral-200/50 transition duration-200',
        compact ? 'p-2.5' : 'p-3',
        'hover:bg-white hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]',
        'active:scale-[0.99]',
        status === 'live' && 'bg-emerald-50/60 ring-emerald-200/60',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              'font-semibold tabular-nums tracking-tight text-text-primary',
              compact ? 'text-lg' : 'text-xl',
            )}
          >
            {scheduled ? formatMatchTime(scheduled) : '—'}
          </p>
          <p className="mt-0.5 truncate text-xs text-text-secondary">
            {scheduled ? formatMatchDate(scheduled) : '—'}
            {item.match.name ? (
              <span className="text-text-primary"> · {item.match.name}</span>
            ) : null}
          </p>
        </div>
        <span className={cn('shrink-0 text-xs font-semibold', STATUS_COLOR[status])}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className={cn('grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center', compact ? 'mt-2 gap-1.5' : 'mt-3 gap-2')}>
        <p
          className={cn(
            'text-right font-medium leading-snug text-text-primary',
            compact ? 'line-clamp-1 text-xs' : 'line-clamp-3 text-sm',
          )}
        >
          {team1}
        </p>
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-neutral-100 font-bold tracking-wider text-neutral-500 transition duration-200 group-hover:bg-primary-50 group-hover:text-primary-600',
            compact ? 'h-7 w-7 text-[8px]' : 'h-8 w-8 text-[9px]',
          )}
          aria-hidden
        >
          VS
        </span>
        <p
          className={cn(
            'text-left font-medium leading-snug text-text-primary',
            compact ? 'line-clamp-1 text-xs' : 'line-clamp-3 text-sm',
          )}
        >
          {team2}
        </p>
      </div>

      {status === 'finished' && score && (
        <p className="mt-2 text-center text-lg font-semibold tabular-nums text-text-primary">
          {score}
        </p>
      )}

      {status === 'pending' && (
        <p className="mt-4 text-center text-sm text-text-secondary">Chưa nhập kết quả</p>
      )}

      {status === 'live' && !item.match.completed && (
        <p className="mt-4 text-center text-sm font-medium text-emerald-700">
          Bo3 · {getShowmatchGamesWon(item.match) ? 'Đang cập nhật' : 'Chờ nhập điểm'}
        </p>
      )}
    </button>
  )
}
