import { Link } from 'react-router-dom'
import { getPlayerAvatarColor, getPlayerInitials } from '../lib/clubPlayers'
import {
  didSkillChange,
  formatSkillChangeLabel,
  type EloHistoryEntry,
} from '../lib/playerRating'
import { cn } from '../lib/cn'
import type { SkillLevel } from '../types'

interface EloHistoryDialogProps {
  open: boolean
  playerName: string
  rating: number
  skillLevel?: SkillLevel
  wins?: number
  losses?: number
  history: EloHistoryEntry[]
  loading?: boolean
  onClose: () => void
}

function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`
  return String(delta)
}

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function EloHistoryDialog({
  open,
  playerName,
  rating,
  skillLevel,
  wins,
  losses,
  history,
  loading = false,
  onClose,
}: EloHistoryDialogProps) {
  if (!open) return null

  const winCount = wins ?? history.filter((e) => e.won).length
  const lossCount = losses ?? history.filter((e) => !e.won).length
  const skillChanges = history.filter(didSkillChange)

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
                {rating} Elo
                {skillLevel ? ` · hạng ${skillLevel}` : ''}
                {!loading && history.length > 0
                  ? ` · ${winCount}W–${lossCount}L · ${history.length} trận`
                  : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          {!loading && skillChanges.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Lịch sử thăng / giáng hạng
              </p>
              <ul className="mt-2 space-y-2">
                {skillChanges.map((entry) => {
                  const promoted = entry.skillBefore === 'B' && entry.skillAfter === 'A'
                  return (
                    <li
                      key={`skill-${entry.matchId}-${entry.eventId}`}
                      className={cn(
                        'rounded-xl border px-3 py-2.5',
                        promoted
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-sky-200 bg-sky-50',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p
                            className={cn(
                              'text-sm font-semibold',
                              promoted ? 'text-amber-800' : 'text-sky-800',
                            )}
                          >
                            {formatSkillChangeLabel(entry.skillBefore, entry.skillAfter)}
                          </p>
                          <Link
                            to={`/event/${entry.eventId}`}
                            onClick={onClose}
                            className="mt-0.5 block truncate text-xs font-medium text-primary-600 hover:underline"
                          >
                            {entry.eventName}
                          </Link>
                          <p className="mt-0.5 text-[11px] tabular-nums text-neutral-500">
                            Sau trận · {entry.ratingAfter} Elo · {formatEventDate(entry.eventDate)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
                            promoted
                              ? 'bg-amber-200/80 text-amber-900'
                              : 'bg-sky-200/80 text-sky-900',
                          )}
                        >
                          {entry.skillBefore}→{entry.skillAfter}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Lịch sử Elo (mini game)
          </p>

          {loading ? (
            <div className="mt-8 mb-4 flex flex-col items-center gap-3 text-center">
              <span
                className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600"
                aria-hidden
              />
              <p className="text-sm text-neutral-500">Đang tải lịch sử Elo…</p>
              <p className="text-xs text-neutral-400">Có thể mất vài giây lần đầu</p>
            </div>
          ) : history.length === 0 ? (
            <p className="mt-4 text-center text-sm text-neutral-400">
              Chưa có trận mini game để tính Elo.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200">
              {history.map((entry) => {
                const skillChanged = didSkillChange(entry)
                const promoted = entry.skillBefore === 'B' && entry.skillAfter === 'A'
                return (
                  <li key={`${entry.matchId}-${entry.eventId}`} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                              entry.won
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-red-50 text-red-700',
                            )}
                          >
                            {entry.won ? 'Thắng' : 'Thua'}
                          </span>
                          <span className="text-[10px] text-neutral-400">Vòng {entry.round}</span>
                          {skillChanged && (
                            <span
                              className={cn(
                                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                                promoted
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-sky-100 text-sky-800',
                              )}
                            >
                              {formatSkillChangeLabel(entry.skillBefore, entry.skillAfter)}
                            </span>
                          )}
                        </div>
                        <Link
                          to={`/event/${entry.eventId}`}
                          onClick={onClose}
                          className="mt-0.5 block truncate text-sm font-medium text-primary-600 hover:underline"
                        >
                          {entry.eventName}
                        </Link>
                        <p className="mt-0.5 text-xs text-neutral-500">
                          vs {entry.opponentNames}
                          {entry.partnerName ? ` · cùng ${entry.partnerName}` : ''}
                        </p>
                        <p className="mt-0.5 text-[11px] tabular-nums text-neutral-400">
                          {entry.ratingBefore} → {entry.ratingAfter}
                          {' · '}
                          {formatEventDate(entry.eventDate)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 text-sm font-bold tabular-nums',
                          entry.delta > 0
                            ? 'text-emerald-600'
                            : entry.delta < 0
                              ? 'text-red-600'
                              : 'text-neutral-500',
                        )}
                      >
                        {formatDelta(entry.delta)}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-neutral-100 px-5 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-600">
              {history.length} trận đã tính
              {skillChanges.length > 0 ? ` · ${skillChanges.length} lần đổi hạng` : ''}
            </span>
            <span className="font-semibold tabular-nums text-neutral-900">{rating} Elo</span>
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
