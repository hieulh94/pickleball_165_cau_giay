import { useEffect, useMemo, useState } from 'react'
import { ContributionHistoryDialog } from './ContributionHistoryDialog'
import { LeaderboardUnlockGate } from './LeaderboardUnlockGate'
import { LeaderboardFilters } from './leaderboard/LeaderboardFilters'
import { LeaderboardPodium } from './leaderboard/LeaderboardPodium'
import { LeaderboardRow } from './leaderboard/LeaderboardRow'
import { getPlayerContributionHistory } from '../lib/contributionStandings'
import {
  calculateLeaderboardStandings,
  getStandingMetricValue,
  type LeaderboardMetric,
  type LeaderboardPeriod,
  type LeaderboardSource,
  type LeaderboardStanding,
} from '../lib/leaderboard'
import { isFirebaseConfigured } from '../lib/firebase'
import { isLeaderboardAccessGranted } from '../lib/leaderboardAccess'
import { subscribeEvents } from '../lib/storage'
import type { PickleballEvent } from '../types'

export function ContributionLeaderboardPanel() {
  const [unlocked, setUnlocked] = useState(() => isLeaderboardAccessGranted())
  const [events, setEvents] = useState<PickleballEvent[]>([])
  const [loading, setLoading] = useState(isFirebaseConfigured())
  const [selectedPlayer, setSelectedPlayer] = useState<LeaderboardStanding | null>(null)
  const [period, setPeriod] = useState<LeaderboardPeriod>('all')
  const [metric, setMetric] = useState<LeaderboardMetric>('earnings')
  const [source, setSource] = useState<LeaderboardSource>('tournament')

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
    () => calculateLeaderboardStandings(events, { period, metric, source }),
    [events, period, metric, source],
  )

  const maxMetricValue = useMemo(
    () => Math.max(0, ...standings.map((row) => getStandingMetricValue(row, metric))),
    [standings, metric],
  )

  const podiumStandings = standings.slice(0, 3)
  const listStandings = standings

  const selectedHistory = useMemo(() => {
    if (!selectedPlayer) return []
    return getPlayerContributionHistory(events, selectedPlayer.name, source)
  }, [events, selectedPlayer, source])

  if (!isFirebaseConfigured()) return null

  if (!unlocked) {
    return <LeaderboardUnlockGate onUnlock={() => setUnlocked(true)} />
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border/60 px-4 py-2">
        <LeaderboardFilters
          period={period}
          metric={metric}
          source={source}
          onPeriodChange={setPeriod}
          onMetricChange={setMetric}
          onSourceChange={setSource}
        />
      </div>

      {loading ? (
        <p className="px-4 py-10 text-center text-sm text-text-secondary">Đang tải bảng xếp hạng...</p>
      ) : standings.length === 0 ? (
        <p className="mx-4 mt-2 rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-text-secondary">
          Chưa có dữ liệu cho bộ lọc này. Nhập beer nộp/người ở{' '}
          {source === 'showmatch' ? 'trận showmatch' : 'mini game'} hoặc chọn khoảng thời gian khác.
        </p>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-4">
            <div className="rounded-2xl border border-border bg-card shadow-sm">
              <LeaderboardPodium
                standings={podiumStandings}
                metric={metric}
                source={source}
                onSelect={setSelectedPlayer}
              />
            </div>

            <div className="pt-3">
              <ul className="space-y-3">
                {listStandings.map((row) => (
                  <LeaderboardRow
                    key={row.name}
                    row={row}
                    metric={metric}
                    source={source}
                    maxMetricValue={maxMetricValue}
                    onSelect={setSelectedPlayer}
                  />
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
            source={source}
            onClose={() => setSelectedPlayer(null)}
          />
        </>
      )}
    </div>
  )
}
