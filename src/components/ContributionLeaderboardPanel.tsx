import { useEffect, useMemo, useState } from 'react'
import { ContributionHistoryDialog } from './ContributionHistoryDialog'
import { LeaderboardFilters } from './leaderboard/LeaderboardFilters'
import { LeaderboardPodium } from './leaderboard/LeaderboardPodium'
import { LeaderboardRow } from './leaderboard/LeaderboardRow'
import { getPlayerContributionHistory } from '../lib/contributionStandings'
import {
  calculateLeaderboardStandings,
  getStandingMetricValue,
  type LeaderboardMetric,
  type LeaderboardPeriod,
  type LeaderboardStanding,
} from '../lib/leaderboard'
import { isFirebaseConfigured } from '../lib/firebase'
import { subscribeEvents } from '../lib/storage'
import type { PickleballEvent } from '../types'

export function ContributionLeaderboardPanel() {
  const [events, setEvents] = useState<PickleballEvent[]>([])
  const [loading, setLoading] = useState(isFirebaseConfigured())
  const [selectedPlayer, setSelectedPlayer] = useState<LeaderboardStanding | null>(null)
  const [period, setPeriod] = useState<LeaderboardPeriod>('all')
  const [metric, setMetric] = useState<LeaderboardMetric>('earnings')

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

  const standings = useMemo(
    () => calculateLeaderboardStandings(events, { period, metric }),
    [events, period, metric],
  )

  const maxMetricValue = useMemo(
    () => Math.max(0, ...standings.map((row) => getStandingMetricValue(row, metric))),
    [standings, metric],
  )

  const podiumStandings = standings.slice(0, 3)
  const listStandings = standings.slice(3)

  const selectedHistory = useMemo(() => {
    if (!selectedPlayer) return []
    return getPlayerContributionHistory(events, selectedPlayer.name)
  }, [events, selectedPlayer])

  if (!isFirebaseConfigured()) return null

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border/60 px-4 py-2">
        <LeaderboardFilters
          period={period}
          metric={metric}
          onPeriodChange={setPeriod}
          onMetricChange={setMetric}
        />
      </div>

      {loading ? (
        <p className="px-4 py-10 text-center text-sm text-text-secondary">Đang tải bảng xếp hạng...</p>
      ) : standings.length === 0 ? (
        <p className="mx-4 mt-2 rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-text-secondary">
          Chưa có dữ liệu cho bộ lọc này. Nhập tiền nộp/người ở mini game hoặc chọn khoảng thời gian
          khác.
        </p>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-4">
            <div className="rounded-2xl border border-border bg-card shadow-sm">
              <LeaderboardPodium
                standings={podiumStandings}
                metric={metric}
                onSelect={setSelectedPlayer}
              />
            </div>

            <div className="pt-3">
              {listStandings.length > 0 ? (
                <ul className="space-y-3">
                  {listStandings.map((row) => (
                    <LeaderboardRow
                      key={row.name}
                      row={row}
                      metric={metric}
                      maxMetricValue={maxMetricValue}
                      onSelect={setSelectedPlayer}
                    />
                  ))}
                </ul>
              ) : (
                <p className="rounded-2xl border border-border bg-card px-4 py-6 text-center text-sm text-text-secondary">
                  Chỉ có top 3 trong bộ lọc này.
                </p>
              )}
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
