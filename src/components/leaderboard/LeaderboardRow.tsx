import {
  getStandingMetricValue,
  type LeaderboardMetric,
  type LeaderboardSource,
  type LeaderboardStanding,
} from '../../lib/leaderboard'
import { cn } from '../../lib/cn'
import { ContributionAmount } from './ContributionCompactAmount'
import { LeaderboardProgressBar } from './LeaderboardProgressBar'
import { PlayerAvatar, PlayerStats } from './LeaderboardPodium'
import { LargeRankBadge, RankTrendBadge } from './RankTrendBadge'

function formatMetricLabel(
  row: LeaderboardStanding,
  metric: LeaderboardMetric,
  source: LeaderboardSource,
): string | null {
  switch (metric) {
    case 'earnings':
      return null
    case 'wins':
      return `${row.wins} thắng`
    case 'matches':
      return `${row.matchesPlayed} trận`
    case 'contribution':
      return source === 'showmatch'
        ? `${row.eventsContributed} trận SM`
        : `${row.eventsContributed} mini game`
  }
}

interface LeaderboardRowProps {
  row: LeaderboardStanding
  metric: LeaderboardMetric
  source: LeaderboardSource
  maxMetricValue: number
  onSelect: (row: LeaderboardStanding) => void
}

export function LeaderboardRow({ row, metric, source, maxMetricValue, onSelect }: LeaderboardRowProps) {
  const metricValue = getStandingMetricValue(row, metric)

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(row)}
        className={cn(
          'leaderboard-row group flex w-full flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-left',
          'shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md',
          'sm:flex-row sm:items-center',
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <LargeRankBadge rank={row.rank} />
            <RankTrendBadge trend={row.trend} />
          </div>

          <PlayerAvatar name={row.name} size="md" />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold uppercase tracking-wide text-text-primary sm:text-base">
              {row.name}
            </p>
            <PlayerStats row={row} source={source} />
            <div className="mt-2 sm:hidden">
              <LeaderboardProgressBar value={metricValue} max={maxMetricValue} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 sm:w-48 sm:flex-col sm:items-end">
          <div className="hidden w-full sm:block">
            <LeaderboardProgressBar value={metricValue} max={maxMetricValue} />
          </div>
          <div className="text-right">
            {metric === 'earnings' ? (
              <ContributionAmount
                amount={row.totalAmount}
                iconClassName="h-6 w-6 sm:h-7 sm:w-7"
                className="text-xl font-bold text-text-primary"
              />
            ) : (
              <p className="text-xl font-bold tabular-nums text-text-primary">
                {formatMetricLabel(row, metric, source)}
              </p>
            )}
            {metric !== 'earnings' && row.totalAmount > 0 && (
              <p className="text-xs text-text-secondary">
                <ContributionAmount
                  amount={row.totalAmount}
                  iconClassName="h-6 w-6 sm:h-7 sm:w-7"
                />
              </p>
            )}
          </div>
          <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition group-hover:border-primary-300 group-hover:text-primary-700">
            Chi tiết
          </span>
        </div>
      </button>
    </li>
  )
}
