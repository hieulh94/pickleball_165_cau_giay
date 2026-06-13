import { useEffect, useMemo, useState } from 'react'
import { ContributionHistoryDialog } from './ContributionHistoryDialog'
import { calculateContributionStandings, getPlayerContributionHistory } from '../lib/contributionStandings'
import type { ContributionStanding } from '../lib/contributionStandings'
import {
  formatContributionAmount,
  formatContributionAmountCompact,
} from '../lib/contributionMoney'
import { getPlayerAvatarColor, getPlayerInitials } from '../lib/clubPlayers'
import { RankCircleBadge, RankDisplay } from './RankBadge'
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
  onSelect,
}: {
  row: ContributionStanding | undefined
  place: 1 | 2 | 3
  onSelect?: (row: ContributionStanding) => void
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
    <button
      type="button"
      onClick={() => onSelect?.(row)}
      className={`flex flex-col items-center justify-end ${styles.order} ${styles.width} rounded-t-2xl transition hover:opacity-90`}
    >
      <RankCircleBadge place={place} size="lg" />
      <p className="mt-2 max-w-full truncate px-1 text-center text-sm font-bold uppercase tracking-wide text-slate-900 sm:text-base">
        {row.name}
      </p>
      <div
        className={`mt-2 flex w-full flex-col items-center justify-end rounded-t-2xl px-2 pb-3 pt-4 text-white ${styles.bar}`}
      >
        <span className="text-xl font-bold sm:text-2xl">{formatContributionAmountCompact(row.totalAmount)}</span>
      </div>
    </button>
  )
}

function Podium({
  standings,
  onSelect,
}: {
  standings: ContributionStanding[]
  onSelect: (row: ContributionStanding) => void
}) {
  const [first, second, third] = standings

  return (
    <div className="flex items-end justify-center gap-2 px-2">
      <PodiumCard row={second} place={2} onSelect={onSelect} />
      <PodiumCard row={first} place={1} onSelect={onSelect} />
      <PodiumCard row={third} place={3} onSelect={onSelect} />
    </div>
  )
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
  const [selectedPlayer, setSelectedPlayer] = useState<ContributionStanding | null>(null)

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

  const selectedHistory = useMemo(() => {
    if (!selectedPlayer) return []
    return getPlayerContributionHistory(events, selectedPlayer.name)
  }, [events, selectedPlayer])

  if (!isFirebaseConfigured()) return null

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-4 pb-4">
      {loading ? (
        <p className="mt-10 text-center text-sm text-slate-400">Đang tải bảng xếp hạng...</p>
      ) : standings.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
          Chưa có dữ liệu cống hiến. Nhập tiền nộp/người ở cuối mini game để cập nhật BXH.
        </p>
      ) : (
        <>
          <div className="shrink-0 border-b border-slate-200 bg-white pb-3">
            <Podium standings={standings} onSelect={setSelectedPlayer} />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pt-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="grid grid-cols-[2.75rem_1fr_auto] gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                <span>#</span>
                <span>Người chơi</span>
                <span className="text-right">Số tiền</span>
              </div>

              <ul className="divide-y divide-slate-100">
              {standings.map((row) => (
                <li key={row.name}>
                  <button
                    type="button"
                    onClick={() => setSelectedPlayer(row)}
                    className="grid w-full grid-cols-[2.75rem_1fr_auto] items-center gap-2 px-4 py-3 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex justify-center">
                      <RankDisplay rank={row.rank} size="sm" />
                    </div>
                    <div className="flex min-w-0 items-center gap-3">
                      <PlayerAvatar name={row.name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold uppercase text-slate-900">
                          {row.name}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {formatContributionSubtext(row)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-right text-base font-bold text-slate-900 sm:text-lg">
                        {formatContributionAmount(row.totalAmount)}
                      </span>
                      <span className="shrink-0 rounded-full border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600">
                        Chi tiết
                      </span>
                    </div>
                  </button>
                </li>
              ))}
              </ul>
            </div>
          </div>

          <ContributionHistoryDialog
            open={!!selectedPlayer}
            playerName={selectedPlayer?.name ?? ''}
            rank={selectedPlayer?.rank}
            totalAmount={selectedPlayer?.totalAmount ?? 0}
            history={selectedHistory}
            onClose={() => setSelectedPlayer(null)}
          />
        </>
      )}
    </div>
  )
}
