import { useEffect, useMemo, useState } from 'react'
import { calculateContributionStandings } from '../lib/contributionStandings'
import type { ContributionStanding } from '../lib/contributionStandings'
import {
  formatContributionAmount,
  formatContributionAmountCompact,
} from '../lib/contributionMoney'
import { getPlayerAvatarColor, getPlayerInitials } from '../lib/clubPlayers'
import { isFirebaseConfigured } from '../lib/firebase'
import { subscribeEvents } from '../lib/storage'
import type { PickleballEvent } from '../types'

function PlayerAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass =
    size === 'lg' ? 'h-12 w-12 text-sm' : size === 'sm' ? 'h-8 w-8 text-[10px]' : 'h-10 w-10 text-xs'

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${sizeClass} ${getPlayerAvatarColor(name)}`}
    >
      {getPlayerInitials(name)}
    </div>
  )
}

function PodiumCard({
  row,
  place,
}: {
  row: ContributionStanding | undefined
  place: 1 | 2 | 3
}) {
  const styles = {
    1: {
      bar: 'h-28 bg-gradient-to-t from-green-600 to-green-500',
      order: 'order-2',
      width: 'w-[30%]',
    },
    2: {
      bar: 'h-20 bg-gradient-to-t from-sky-600 to-sky-400',
      order: 'order-1',
      width: 'w-[28%]',
    },
    3: {
      bar: 'h-16 bg-gradient-to-t from-orange-500 to-amber-400',
      order: 'order-3',
      width: 'w-[28%]',
    },
  }[place]

  if (!row) {
    return (
      <div className={`flex flex-col items-center justify-end ${styles.order} ${styles.width}`}>
        <div className={`mt-2 w-full rounded-t-2xl ${styles.bar} opacity-30`} />
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center justify-end ${styles.order} ${styles.width}`}>
      <PlayerAvatar name={row.name} size="lg" />
      <p className="mt-2 max-w-full truncate px-1 text-center text-xs font-semibold text-slate-800">
        {row.name}
      </p>
      <div
        className={`mt-2 flex w-full flex-col items-center justify-end rounded-t-2xl px-2 pb-3 pt-4 text-white ${styles.bar}`}
      >
        <span className="text-sm font-bold">#{row.rank}</span>
        <span className="mt-1 text-lg font-bold">{formatContributionAmountCompact(row.totalAmount)}</span>
      </div>
    </div>
  )
}

function Podium({ standings }: { standings: ContributionStanding[] }) {
  const [first, second, third] = standings

  return (
    <div className="flex items-end justify-center gap-2 px-2 pt-4">
      <PodiumCard row={second} place={2} />
      <PodiumCard row={first} place={1} />
      <PodiumCard row={third} place={3} />
    </div>
  )
}

function rankTextClass(rank: number): string {
  if (rank === 1) return 'text-amber-500'
  if (rank === 2) return 'text-slate-500'
  if (rank === 3) return 'text-orange-500'
  return 'text-slate-400'
}

function formatContributionSubtext(row: ContributionStanding): string {
  const eventPart =
    row.eventsContributed > 1
      ? `${row.eventsContributed} mini game`
      : '1 mini game'
  if (row.matchesPlayed > 0) {
    return `${eventPart} · ${row.matchesPlayed} trận`
  }
  return eventPart
}

export function ContributionLeaderboardPanel() {
  const [events, setEvents] = useState<PickleballEvent[]>([])
  const [loading, setLoading] = useState(isFirebaseConfigured())

  useEffect(() => {
    if (!isFirebaseConfigured()) return

    return subscribeEvents(
      (data) => {
        setEvents(data)
        setLoading(false)
      },
      () => setLoading(false),
    )
  }, [])

  const standings = useMemo(() => calculateContributionStandings(events), [events])

  if (!isFirebaseConfigured()) return null

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <h2 className="text-center text-lg font-bold text-slate-900">Bảng xếp hạng cống hiến</h2>
      <p className="mt-1 text-center text-xs text-slate-500">
        Tổng hợp từ mini game · xếp theo tổng tiền cống hiến đã nộp
      </p>

      {loading ? (
        <p className="mt-10 text-center text-sm text-slate-400">Đang tải bảng xếp hạng...</p>
      ) : standings.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
          Chưa có dữ liệu cống hiến. Nhập tiền nộp/người ở cuối mini game để cập nhật BXH.
        </p>
      ) : (
        <>
          <Podium standings={standings} />

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-[2.5rem_1fr_auto] gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              <span>#</span>
              <span>Người chơi</span>
              <span className="text-right">Số tiền</span>
            </div>

            <ul className="divide-y divide-slate-100">
              {standings.map((row) => (
                <li
                  key={row.name}
                  className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 px-4 py-3"
                >
                  <span className={`text-sm font-bold ${rankTextClass(row.rank)}`}>{row.rank}</span>
                  <div className="flex min-w-0 items-center gap-3">
                    <PlayerAvatar name={row.name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{row.name}</p>
                      <p className="truncate text-xs text-slate-500">{formatContributionSubtext(row)}</p>
                    </div>
                  </div>
                  <span className="text-right text-sm font-bold text-slate-900">
                    {formatContributionAmount(row.totalAmount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
