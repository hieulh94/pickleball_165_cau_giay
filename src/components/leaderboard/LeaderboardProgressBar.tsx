import { cn } from '../../lib/cn'

interface LeaderboardProgressBarProps {
  value: number
  max: number
  className?: string
  barClassName?: string
}

export function LeaderboardProgressBar({
  value,
  max,
  className,
  barClassName,
}: LeaderboardProgressBarProps) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0

  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-neutral-100', className)}>
      <div
        className={cn(
          'leaderboard-progress-fill h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400',
          barClassName,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
