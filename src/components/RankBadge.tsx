const SIZES = {
  sm: 'h-8 w-8 border-2 text-sm',
  md: 'h-10 w-10 border-2 text-base',
  lg: 'h-12 w-12 border-[3px] text-lg',
} as const

const RANK_COLORS: Record<1 | 2 | 3, string> = {
  1: 'bg-amber-500',
  2: 'bg-slate-400',
  3: 'bg-orange-500',
}

export function RankCircleBadge({
  place,
  size = 'sm',
}: {
  place: 1 | 2 | 3
  size?: keyof typeof SIZES
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-white font-bold text-white shadow-md ${RANK_COLORS[place]} ${SIZES[size]}`}
      aria-label={`Hạng ${place}`}
    >
      {place}
    </span>
  )
}

export function RankOneBadge({ size = 'sm' }: { size?: keyof typeof SIZES }) {
  return <RankCircleBadge place={1} size={size} />
}

export function RankDisplay({
  rank,
  size = 'sm',
}: {
  rank: number
  size?: keyof typeof SIZES
}) {
  if (rank >= 1 && rank <= 3) {
    return <RankCircleBadge place={rank as 1 | 2 | 3} size={size} />
  }

  return (
    <span className="inline-flex w-8 justify-center text-sm font-bold text-slate-400">{rank}</span>
  )
}
