import { Link } from 'react-router-dom'
import type { ContributionHistoryEntry, LeaderboardSource } from '../lib/contributionStandings'
import { getPlayerAvatarColor, getPlayerInitials } from '../lib/clubPlayers'
import { ContributionAmount } from './leaderboard/ContributionCompactAmount'

interface ContributionHistoryDialogProps {
  open: boolean
  playerName: string
  rank?: number
  totalAmount: number
  history: ContributionHistoryEntry[]
  source?: LeaderboardSource
  onClose: () => void
}

export function ContributionHistoryDialog({
  open,
  playerName,
  rank,
  totalAmount,
  history,
  source = 'tournament',
  onClose,
}: ContributionHistoryDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl">
        <div className="border-b border-neutral-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${getPlayerAvatarColor(playerName)}`}
            >
              {getPlayerInitials(playerName)}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-neutral-900">{playerName}</h3>
              <p className="text-sm text-neutral-500">
                {rank !== undefined ? `Hạng ${rank} · ` : ''}
                Tổng <ContributionAmount amount={totalAmount} compact={false} iconClassName="h-4 w-4" />
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Lịch sử beer
          </p>

          {history.length === 0 ? (
            <p className="mt-4 text-center text-sm text-neutral-400">Chưa có lịch sử beer.</p>
          ) : (
            <ul className="mt-3 divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200">
              {history.map((entry) => (
                <li key={entry.matchId ?? entry.eventId} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/event/${entry.eventId}`}
                        onClick={onClose}
                        className="text-sm font-medium text-primary-600 hover:underline"
                      >
                        {entry.matchName ? `${entry.matchName} · ${entry.eventName}` : entry.eventName}
                      </Link>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {new Date(entry.eventDate).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <ContributionAmount
                      amount={entry.amount}
                      compact={false}
                      iconClassName="h-4 w-4"
                      className="shrink-0 text-sm font-bold text-neutral-900"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-neutral-100 px-5 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-600">
              {history.length}{' '}
              {source === 'showmatch' ? 'trận showmatch' : 'mini game'}
            </span>
            <span className="font-semibold text-neutral-900">
              Tổng: <ContributionAmount amount={totalAmount} compact={false} iconClassName="h-4 w-4" />
            </span>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
