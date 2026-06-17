import { formatScheduledAt } from '../../lib/showmatch'
import { formatShowmatchResult, isBo3Match } from '../../lib/showmatchScoring'
import type { WeeklyShowmatchItem } from '../../lib/showmatch'
import { Button } from '../ui/Button'
import { cn } from '../../lib/cn'
import {
  formatCountdown,
  formatTeamLabel,
  getMatchStatus,
  type MatchStatus,
} from './showmatchWeekUtils'

const STATUS_LABEL: Record<MatchStatus, string> = {
  upcoming: 'Sắp đấu',
  live: 'Đang đấu',
  finished: 'Đã xong',
  pending: 'Chờ kết quả',
}

const STATUS_BADGE: Record<MatchStatus, string> = {
  upcoming: 'bg-primary-50 text-primary-700 ring-primary-200',
  live: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  finished: 'bg-neutral-100 text-text-secondary ring-neutral-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
}

interface ShowmatchMatchDetailDialogProps {
  open: boolean
  item: WeeklyShowmatchItem | null
  nowMs: number
  onClose: () => void
  onOpenEvent: () => void
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-sm text-text-secondary">{label}</dt>
      <dd className="text-sm font-medium text-text-primary sm:text-right">{value}</dd>
    </div>
  )
}

export function ShowmatchMatchDetailDialog({
  open,
  item,
  nowMs,
  onClose,
  onOpenEvent,
}: ShowmatchMatchDetailDialogProps) {
  if (!open || !item) return null

  const status = getMatchStatus(item, nowMs)
  const team1 = formatTeamLabel(item.pair1Label) || '—'
  const team2 = formatTeamLabel(item.pair2Label) || '—'
  const result = formatShowmatchResult(item.match)
  const scheduled = item.match.scheduledAt
  const nextMs = scheduled ? new Date(scheduled).getTime() : null
  const showCountdown = nextMs && nextMs > nowMs && (status === 'upcoming' || status === 'live')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="showmatch-match-dialog-title"
        className="relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl"
      >
        <div className="border-b border-neutral-100 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-text-secondary">{item.eventName}</p>
              <h2
                id="showmatch-match-dialog-title"
                className="mt-1 text-lg font-semibold text-text-primary"
              >
                {item.match.name ?? 'Showmatch'}
              </h2>
            </div>
            <span
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
                STATUS_BADGE[status],
              )}
            >
              {STATUS_LABEL[status]}
            </span>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-4 sm:px-6">
          <dl className="space-y-3">
            {scheduled && (
              <InfoRow label="Thời gian" value={formatScheduledAt(scheduled)} />
            )}
            {showCountdown && nextMs && (
              <InfoRow label="Còn lại" value={formatCountdown(nextMs, nowMs)} />
            )}
            {item.match.court > 0 && (
              <InfoRow label="Sân" value={`Sân ${item.match.court}`} />
            )}
            {isBo3Match(item.match) && (
              <InfoRow label="Thể thức" value="Bo3 (chạm 2)" />
            )}
          </dl>

          <div className="mt-6 rounded-2xl bg-neutral-50 p-4 ring-1 ring-neutral-200/60">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <p className="text-right text-base font-semibold leading-snug text-text-primary">
                {team1}
              </p>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xs font-bold tracking-wider text-neutral-500 ring-1 ring-neutral-200">
                VS
              </span>
              <p className="text-left text-base font-semibold leading-snug text-text-primary">
                {team2}
              </p>
            </div>

            {result && (
              <p className="mt-4 text-center text-2xl font-semibold tabular-nums text-text-primary">
                {result}
              </p>
            )}

            {status === 'pending' && (
              <p className="mt-4 text-center text-sm text-text-secondary">Chưa nhập kết quả</p>
            )}

            {item.match.games && item.match.games.length > 0 && (
              <div className="mt-4 border-t border-neutral-200/70 pt-4">
                <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-text-secondary">
                  Chi tiết ván
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {item.match.games.map((game, index) => (
                    <span
                      key={index}
                      className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium tabular-nums text-text-primary ring-1 ring-neutral-200"
                    >
                      Ván {index + 1}: {game.score1}–{game.score2}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 border-t border-neutral-100 px-5 py-4 sm:px-6">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Đóng
          </Button>
          <Button className="flex-1" onClick={onOpenEvent}>
            Vào event
          </Button>
        </div>
      </div>
    </div>
  )
}
