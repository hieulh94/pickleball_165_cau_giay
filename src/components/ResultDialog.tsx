import { useEffect, useState } from 'react'
import { isPlayoffMatch } from '../lib/matches'
import type { Match } from '../types'

interface ResultDialogProps {
  open: boolean
  match: Match | null
  team1Label: string
  team2Label: string
  onClose: () => void
  onSubmit: (score1: number, score2: number) => void
}

export function ResultDialog({
  open,
  match,
  team1Label,
  team2Label,
  onClose,
  onSubmit,
}: ResultDialogProps) {
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (open && match) {
      setScore1(match.score1?.toString() ?? '')
      setScore2(match.score2?.toString() ?? '')
      setShowConfirm(false)
    }
  }, [open, match])

  if (!open || !match) return null

  const handleSave = () => {
    const s1 = parseInt(score1, 10)
    const s2 = parseInt(score2, 10)
    if (Number.isNaN(s1) || Number.isNaN(s2) || s1 < 0 || s2 < 0) return
    setShowConfirm(true)
  }

  const handleConfirm = () => {
    onSubmit(parseInt(score1, 10), parseInt(score2, 10))
    setShowConfirm(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {!showConfirm ? (
          <>
            <h3 className="text-lg font-semibold text-neutral-900">Cập nhật kết quả</h3>
            <p className="mt-1 text-sm text-neutral-500">
              {isPlayoffMatch(match)
                ? `${match.name || 'Vòng loại trực tiếp'} · Sân ${match.court}`
                : `Vòng ${match.round} · Sân ${match.court}${match.group ? ` · ${match.group}` : ''}`}
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  {team1Label}
                </label>
                <input
                  type="number"
                  min={0}
                  value={score1}
                  onChange={(e) => setScore1(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
                  placeholder="Điểm"
                />
              </div>
              <div className="text-center text-sm font-medium text-neutral-400">VS</div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  {team2Label}
                </label>
                <input
                  type="number"
                  min={0}
                  value={score2}
                  onChange={(e) => setScore2(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
                  placeholder="Điểm"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={score1 === '' || score2 === ''}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                Lưu kết quả
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-neutral-900">Xác nhận kết quả</h3>
            <p className="mt-3 text-sm text-neutral-600">
              Bạn có chắc muốn cập nhật kết quả trận đấu này?
            </p>
            <div className="mt-4 rounded-xl bg-neutral-50 p-4 text-center">
              <p className="text-sm font-medium text-neutral-800">{team1Label}</p>
              <p className="my-2 text-2xl font-bold text-primary-600">
                {score1} - {score2}
              </p>
              <p className="text-sm font-medium text-neutral-800">{team2Label}</p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Xác nhận
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
