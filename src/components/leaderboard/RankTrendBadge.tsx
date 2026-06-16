import { cn } from '../../lib/cn'

export function RankTrendBadge({ trend }: { trend: number | null }) {
  if (trend === null) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary">
        <span aria-hidden>▬</span>
        <span className="sr-only">Không đổi hạng</span>
      </span>
    )
  }

  if (trend > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
        <span aria-hidden>▲</span>
        +{trend}
      </span>
    )
  }

  if (trend < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
        <span aria-hidden>▼</span>
        {trend}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-0.5 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary">
      <span aria-hidden>▬</span>
    </span>
  )
}

export function LargeRankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="flex h-11 w-11 items-center justify-center text-2xl" aria-label="Hạng 1">
        🥇
      </span>
    )
  }
  if (rank === 2) {
    return (
      <span className="flex h-11 w-11 items-center justify-center text-2xl" aria-label="Hạng 2">
        🥈
      </span>
    )
  }
  if (rank === 3) {
    return (
      <span className="flex h-11 w-11 items-center justify-center text-2xl" aria-label="Hạng 3">
        🥉
      </span>
    )
  }

  return (
    <span
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
        'border border-border bg-neutral-50 text-sm font-bold text-text-primary',
      )}
      aria-label={`Hạng ${rank}`}
    >
      #{rank}
    </span>
  )
}
