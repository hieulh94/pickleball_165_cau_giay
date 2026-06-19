import { Button } from './ui/Button'
import { getPairColor } from '../lib/pairColors'
import type { PairScheduleEntry } from '../lib/pairSchedule'

type PairScheduleDialogProps = {
  open: boolean
  pairNumber: number
  pairLabel: string
  entries: PairScheduleEntry[]
  onClose: () => void
}

export function PairScheduleDialog({
  open,
  pairNumber,
  pairLabel,
  entries,
  onClose,
}: PairScheduleDialogProps) {
  if (!open) return null

  const color = getPairColor(pairNumber)
  const completedCount = entries.filter((entry) => entry.completed).length
  const winCount = entries.filter((entry) => entry.isWin).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[min(85vh,40rem)] w-full max-w-lg flex-col rounded-xl border border-neutral-200 bg-white shadow-xl">
        <div className="border-b border-neutral-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-xs font-bold ${color.border} ${color.bg} ${color.text}`}
            >
              <span className={`h-2.5 w-2.5 rounded-full border ${color.swatch}`} />
              Cặp {pairNumber}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-neutral-900">Lịch thi đấu</h3>
              <p className="mt-0.5 text-sm text-neutral-600">{pairLabel}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-neutral-700">
            Tổng <span className="font-semibold">{entries.length}</span> trận
            {entries.length > 0 && (
              <>
                {' '}
                · Đã đấu <span className="font-semibold">{completedCount}</span>
                {completedCount > 0 && (
                  <>
                    {' '}
                    · Thắng <span className="font-semibold text-primary-700">{winCount}</span>
                  </>
                )}
              </>
            )}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {entries.length === 0 ? (
            <p className="text-sm text-neutral-500">Chưa có trận nào trong lịch vòng bảng.</p>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry) => (
                <li
                  key={entry.matchId}
                  className={`rounded-xl border px-3 py-2.5 ${
                    entry.completed
                      ? entry.isWin
                        ? 'border-primary-200 bg-primary-50/60'
                        : 'border-neutral-200 bg-neutral-50'
                      : 'border-neutral-200 bg-white'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-neutral-800">
                    <span>Vòng {entry.round}</span>
                    <span className="text-neutral-300">·</span>
                    <span>Sân {entry.court}</span>
                    {entry.group && (
                      <>
                        <span className="text-neutral-300">·</span>
                        <span className="text-secondary-700">{entry.group}</span>
                      </>
                    )}
                    {entry.completed && entry.scoreText && (
                      <span
                        className={`ml-auto rounded-md px-2 py-0.5 ${
                          entry.isWin
                            ? 'bg-primary-100 text-primary-800'
                            : 'bg-neutral-200 text-neutral-700'
                        }`}
                      >
                        {entry.scoreText}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-neutral-700">
                    vs{' '}
                    <span className="font-medium">
                      Cặp {entry.opponentPairNumber}
                    </span>
                    <span className="text-neutral-500"> — {entry.opponentLabel}</span>
                  </p>
                  {!entry.completed && (
                    <p className="mt-1 text-xs text-amber-700">Chưa đấu</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end border-t border-neutral-100 px-5 py-4">
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  )
}
