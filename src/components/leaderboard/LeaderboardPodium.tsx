import { getPlayerAvatarColor, getPlayerInitials } from '../../lib/clubPlayers'
import {
  formatContributionAmount,
  formatContributionAmountCompact,
} from '../../lib/contributionMoney'
import type { LeaderboardMetric, LeaderboardStanding } from '../../lib/leaderboard'
import { cn } from '../../lib/cn'

function PlayerAvatar({ name, size = 'lg' }: { name: string; size?: 'md' | 'lg' | 'xl' }) {
  const sizeClass =
    size === 'xl'
      ? 'h-11 w-11 text-sm ring-2 ring-white sm:h-16 sm:w-16 sm:text-lg sm:ring-4'
      : size === 'lg'
        ? 'h-10 w-10 text-xs ring-2 ring-white sm:h-14 sm:w-14 sm:text-base sm:ring-4'
        : 'h-10 w-10 text-xs'

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-md',
        sizeClass,
        getPlayerAvatarColor(name),
      )}
    >
      {getPlayerInitials(name)}
    </div>
  )
}

function PlayerStats({ row }: { row: LeaderboardStanding }) {
  return (
    <>
      <p className="mt-0.5 text-[10px] text-text-secondary sm:hidden">
        🎾 {row.matchesPlayed} · 🎮 {row.eventsContributed}
      </p>
      <div className="mt-1 hidden flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-text-secondary sm:flex">
        <span>🎾 {row.matchesPlayed} trận</span>
        <span>
          🎮 {row.eventsContributed} mini game{row.eventsContributed !== 1 ? '' : ''}
        </span>
        {row.wins > 0 && <span>🏆 {row.wins} thắng</span>}
      </div>
    </>
  )
}

const PODIUM_STYLES = {
  1: {
    order: 'order-2',
    width: 'w-[34%] max-w-[11rem]',
    card: 'border-2 border-amber-400 bg-gradient-to-b from-amber-50 to-card shadow-[0_12px_32px_rgba(245,158,11,0.2)]',
    medal: '🥇',
    scale: 'sm:scale-110',
    amount: 'text-lg sm:text-[32px]',
  },
  2: {
    order: 'order-1',
    width: 'w-[30%] max-w-[9.5rem]',
    card: 'border border-slate-300 bg-gradient-to-b from-slate-50 to-card shadow-md',
    medal: '🥈',
    scale: 'mt-2 sm:mt-4',
    amount: 'text-base sm:text-2xl',
  },
  3: {
    order: 'order-3',
    width: 'w-[30%] max-w-[9.5rem]',
    card: 'border border-amber-700/30 bg-gradient-to-b from-orange-50 to-card shadow-md',
    medal: '🥉',
    scale: 'mt-3 sm:mt-6',
    amount: 'text-base sm:text-2xl',
  },
} as const

function formatPodiumMetric(row: LeaderboardStanding, metric: LeaderboardMetric): string {
  switch (metric) {
    case 'earnings':
      return formatContributionAmountCompact(row.totalAmount)
    case 'wins':
      return `${row.wins} thắng`
    case 'matches':
      return `${row.matchesPlayed} trận`
    case 'contribution':
      return `${row.eventsContributed} mini game`
  }
}

function PodiumSlot({
  row,
  place,
  metric,
  onSelect,
}: {
  row: LeaderboardStanding | undefined
  place: 1 | 2 | 3
  metric: LeaderboardMetric
  onSelect: (row: LeaderboardStanding) => void
}) {
  const styles = PODIUM_STYLES[place]

  if (!row) {
    return (
      <div className={cn('flex flex-col items-center', styles.order, styles.width, styles.scale)}>
        <div className={cn('w-full rounded-2xl border border-dashed border-border p-4 opacity-40', styles.card)}>
          <div className="mx-auto h-12 w-12 rounded-full bg-neutral-200" />
          <p className="mt-3 text-center text-xs text-text-secondary">—</p>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(row)}
      className={cn(
        'leaderboard-podium-enter flex flex-col items-center text-left transition hover:-translate-y-0.5',
        styles.order,
        styles.width,
        styles.scale,
      )}
    >
      <div className={cn('relative w-full rounded-2xl p-2 sm:p-4', styles.card)}>
        {place === 1 && (
          <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-base sm:-top-3 sm:text-xl" aria-hidden>
            👑
          </span>
        )}
        <div className="flex flex-col items-center">
          <span className="text-base sm:text-2xl" aria-hidden>
            {styles.medal}
          </span>
          <div className="-mt-0.5">
            <PlayerAvatar name={row.name} size={place === 1 ? 'xl' : 'lg'} />
          </div>
          <p className="mt-1 max-w-full truncate text-center text-[10px] font-bold uppercase tracking-wide text-text-primary sm:mt-2 sm:text-sm">
            {row.name}
          </p>
          {place === 1 && (
            <span className="mt-0.5 hidden rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white sm:inline">
              Champion
            </span>
          )}
          <p className={cn('mt-1 font-bold tabular-nums text-text-primary sm:mt-2', styles.amount)}>
            {row ? formatPodiumMetric(row, metric) : '—'}
          </p>
          {metric === 'earnings' && row.totalAmount > 0 && (
            <p className="hidden text-[10px] text-text-secondary sm:block">
              {formatContributionAmount(row.totalAmount)}
            </p>
          )}
          <PlayerStats row={row} />
        </div>
      </div>
    </button>
  )
}

export function LeaderboardPodium({
  standings,
  metric,
  onSelect,
}: {
  standings: LeaderboardStanding[]
  metric: LeaderboardMetric
  onSelect: (row: LeaderboardStanding) => void
}) {
  const [first, second, third] = standings

  return (
    <div className="flex items-end justify-center gap-1.5 px-1 pb-2 pt-2 sm:gap-3 sm:pt-4">
      <PodiumSlot row={second} place={2} metric={metric} onSelect={onSelect} />
      <PodiumSlot row={first} place={1} metric={metric} onSelect={onSelect} />
      <PodiumSlot row={third} place={3} metric={metric} onSelect={onSelect} />
    </div>
  )
}

export { PlayerAvatar, PlayerStats, formatContributionAmount }
