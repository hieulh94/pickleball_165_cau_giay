import { cn } from '../../lib/cn'
import type { LeaderboardMetric, LeaderboardPeriod } from '../../lib/leaderboard'

const PERIOD_OPTIONS: { id: LeaderboardPeriod; label: string; short: string }[] = [
  { id: 'today', label: 'Hôm nay', short: 'Nay' },
  { id: 'week', label: 'Tuần này', short: 'Tuần' },
  { id: 'month', label: 'Tháng này', short: 'Tháng' },
  { id: 'all', label: 'Tất cả', short: 'Tất cả' },
]

const METRIC_OPTIONS: { id: LeaderboardMetric; label: string; short: string }[] = [
  { id: 'earnings', label: '💰 Tiền cống hiến', short: '💰 Tiền' },
  { id: 'wins', label: '🏆 Thắng', short: '🏆 Thắng' },
  { id: 'matches', label: '🎾 Trận', short: '🎾 Trận' },
  { id: 'contribution', label: '⭐ Mini game', short: '⭐ Mini' },
]

interface LeaderboardFiltersProps {
  period: LeaderboardPeriod
  metric: LeaderboardMetric
  onPeriodChange: (period: LeaderboardPeriod) => void
  onMetricChange: (metric: LeaderboardMetric) => void
}

function FilterPill({
  label,
  shortLabel,
  active,
  onClick,
}: {
  label: string
  shortLabel: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        'h-7 shrink-0 rounded-full px-2.5 text-[11px] font-medium transition sm:h-8 sm:px-3 sm:text-xs',
        active
          ? 'bg-primary-600 text-white shadow-sm'
          : 'border border-border bg-card text-text-secondary hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700',
      )}
    >
      <span className="sm:hidden">{shortLabel}</span>
      <span className="hidden sm:inline">{label}</span>
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
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {PERIOD_OPTIONS.map((option) => (
        <FilterPill
          key={option.id}
          label={option.label}
          shortLabel={option.short}
          active={period === option.id}
          onClick={() => onPeriodChange(option.id)}
        />
      ))}
      <span className="mx-0.5 h-4 w-px shrink-0 bg-border" aria-hidden />
      {METRIC_OPTIONS.map((option) => (
        <FilterPill
          key={option.id}
          label={option.label}
          shortLabel={option.short}
          active={metric === option.id}
          onClick={() => onMetricChange(option.id)}
        />
      ))}
    </div>
  )
}
