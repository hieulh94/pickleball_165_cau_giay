import { Link } from 'react-router-dom'
import type { ContributionHistoryEntry } from '../lib/contributionStandings'
import { formatContributionAmount } from '../lib/contributionMoney'
import { getPlayerAvatarColor, getPlayerInitials } from '../lib/clubPlayers'

interface ContributionHistoryDialogProps {
  open: boolean
  playerName: string
  rank?: number
  totalAmount: number
  history: ContributionHistoryEntry[]
  onClose: () => void
}

export function ContributionHistoryDialog({
  open,
  playerName,
  rank,
  totalAmount,
  history,
  onClose,
}: ContributionHistoryDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${getPlayerAvatarColor(playerName)}`}
            >
              {getPlayerInitials(playerName)}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-slate-900">{playerName}</h3>
              <p className="text-sm text-slate-500">
                {rank !== undefined ? `Hạng ${rank} · ` : ''}
                Tổng {formatContributionAmount(totalAmount)}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Lịch sử cống hiến
          </p>

          {history.length === 0 ? (
            <p className="mt-4 text-center text-sm text-slate-400">Chưa có lịch sử cống hiến.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
              {history.map((entry) => (
                <li key={entry.eventId} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/event/${entry.eventId}`}
                        onClick={onClose}
                        className="text-sm font-medium text-green-600 hover:underline"
                      >
                        {entry.eventName}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {new Date(entry.eventDate).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-slate-900">
                      {formatContributionAmount(entry.amount)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">{history.length} mini game</span>
            <span className="font-semibold text-slate-900">
              Tổng: {formatContributionAmount(totalAmount)}
            </span>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
