import { cn } from '../../lib/cn'
import type { LeaderboardMetric, LeaderboardPeriod } from '../../lib/leaderboard'

const PERIOD_OPTIONS: { id: LeaderboardPeriod; label: string }[] = [
  { id: 'today', label: 'Hôm nay' },
  { id: 'week', label: 'Tuần này' },
  { id: 'month', label: 'Tháng này' },
  { id: 'all', label: 'Tất cả' },
]

const METRIC_OPTIONS: { id: LeaderboardMetric; label: string }[] = [
  { id: 'earnings', label: '💰 Tiền cống hiến' },
  { id: 'wins', label: '🏆 Thắng' },
  { id: 'matches', label: '🎾 Trận' },
  { id: 'contribution', label: '⭐ Mini game' },
]

interface LeaderboardFiltersProps {
  period: LeaderboardPeriod
  metric: LeaderboardMetric
  onPeriodChange: (period: LeaderboardPeriod) => void
  onMetricChange: (metric: LeaderboardMetric) => void
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-8 shrink-0 rounded-full px-3 text-xs font-medium transition sm:text-sm',
        active
          ? 'bg-primary-600 text-white shadow-sm'
          : 'border border-border bg-card text-text-secondary hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700',
      )}
    >
      {label}
    </button>
  )
}

export function LeaderboardFilters({
  period,
  metric,
  onPeriodChange,
  onMetricChange,
}: LeaderboardFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PERIOD_OPTIONS.map((option) => (
          <FilterPill
            key={option.id}
            label={option.label}
            active={period === option.id}
            onClick={() => onPeriodChange(option.id)}
          />
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {METRIC_OPTIONS.map((option) => (
          <FilterPill
            key={option.id}
            label={option.label}
            active={metric === option.id}
            onClick={() => onMetricChange(option.id)}
          />
        ))}
      </div>
    </div>
  )
}
