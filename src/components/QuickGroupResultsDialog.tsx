import { useEffect, useMemo, useState } from 'react'
import { getPairLabel } from '../lib/pairing'
import type { Match, Pair, Participant } from '../types'

export interface QuickGroupResultEntry {
  matchId: string
  score1: number
  score2: number
}

interface QuickGroupResultsDialogProps {
  open: boolean
  matches: Match[]
  pairs: Pair[]
  participants: Participant[]
  pairNumberById: Map<string, number>
  onClose: () => void
  onSave: (results: QuickGroupResultEntry[]) => void
}

type ScoreDraft = Record<string, { score1: string; score2: string }>

function buildDraft(matches: Match[]): ScoreDraft {
  const draft: ScoreDraft = {}
  for (const match of matches) {
    draft[match.id] = {
      score1: match.score1 !== undefined ? String(match.score1) : '',
      score2: match.score2 !== undefined ? String(match.score2) : '',
    }
  }
  return draft
}

function collectGroups(matches: Match[]): string[] {
  const groups = new Set<string>()
  for (const match of matches) {
    if (match.group) groups.add(match.group)
  }
  return [...groups].sort((a, b) => a.localeCompare(b, 'vi'))
}

export function QuickGroupResultsDialog({
  open,
  matches,
  pairs,
  participants,
  pairNumberById,
  onClose,
  onSave,
}: QuickGroupResultsDialogProps) {
  const groups = useMemo(() => collectGroups(matches), [matches])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [draft, setDraft] = useState<ScoreDraft>({})
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (!open) return
    const nextGroups = collectGroups(matches)
    setSelectedGroup(nextGroups[0] ?? '')
    setDraft(buildDraft(matches))
    setError(null)
    setShowConfirm(false)
  }, [open, matches])

  const filteredMatches = useMemo(() => {
    const list =
      groups.length === 0
        ? matches
        : matches.filter((m) => m.group === selectedGroup)
    return [...list].sort((a, b) => a.round - b.round || a.court - b.court)
  }, [matches, groups.length, selectedGroup])

  const pairLabel = (pairId: string | null) => {
    if (!pairId) return '—'
    const pair = pairs.find((p) => p.id === pairId)
    if (!pair) return '—'
    const num = pairNumberById.get(pairId)
    const names = getPairLabel(pair, participants)
    return num ? `Cặp ${num}: ${names}` : names
  }

  const updateScore = (matchId: string, field: 'score1' | 'score2', value: string) => {
    setDraft((prev) => ({
      ...prev,
      [matchId]: {
        score1: prev[matchId]?.score1 ?? '',
        score2: prev[matchId]?.score2 ?? '',
        [field]: value,
      },
    }))
    setError(null)
  }

  const parseResults = (): QuickGroupResultEntry[] | null => {
    const results: QuickGroupResultEntry[] = []
    let incomplete = 0

    for (const match of filteredMatches) {
      const row = draft[match.id] ?? { score1: '', score2: '' }
      const has1 = row.score1.trim() !== ''
      const has2 = row.score2.trim() !== ''

      if (!has1 && !has2) continue
      if (has1 !== has2) {
        incomplete += 1
        continue
      }

      const score1 = parseInt(row.score1, 10)
      const score2 = parseInt(row.score2, 10)
      if (Number.isNaN(score1) || Number.isNaN(score2) || score1 < 0 || score2 < 0) {
        setError('Điểm phải là số nguyên ≥ 0.')
        return null
      }
      results.push({ matchId: match.id, score1, score2 })
    }

    if (incomplete > 0) {
      setError(`Có ${incomplete} trận chỉ điền một bên điểm — hãy điền đủ cả hai.`)
      return null
    }
    if (results.length === 0) {
      setError('Chưa điền kết quả trận nào.')
      return null
    }
    return results
  }

  const pendingResults = useMemo(() => {
    const results: QuickGroupResultEntry[] = []
    for (const match of filteredMatches) {
      const row = draft[match.id] ?? { score1: '', score2: '' }
      if (row.score1.trim() === '' || row.score2.trim() === '') continue
      const score1 = parseInt(row.score1, 10)
      const score2 = parseInt(row.score2, 10)
      if (Number.isNaN(score1) || Number.isNaN(score2) || score1 < 0 || score2 < 0) continue
      results.push({ matchId: match.id, score1, score2 })
    }
    return results
  }, [draft, filteredMatches])

  if (!open) return null

  const handleSaveClick = () => {
    const results = parseResults()
    if (!results) return
    setShowConfirm(true)
  }

  const handleConfirm = () => {
    const results = parseResults()
    if (!results) {
      setShowConfirm(false)
      return
    }
    onSave(results)
    setShowConfirm(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[min(90dvh,44rem)] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
        {!showConfirm ? (
          <>
            <div className="shrink-0 border-b border-neutral-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-neutral-900">Điền kết quả nhanh</h3>
              <p className="mt-1 text-sm text-neutral-500">
                Chọn bảng, điền điểm các trận rồi bấm Lưu để cập nhật cùng lúc.
              </p>

              {groups.length > 0 && (
                <div className="mt-4">
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Chọn bảng
                  </label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => {
                      setSelectedGroup(e.target.value)
                      setError(null)
                    }}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
                  >
                    {groups.map((group) => (
                      <option key={group} value={group}>
                        {group}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              {filteredMatches.length === 0 ? (
                <p className="text-sm text-neutral-500">Không có trận nào trong bảng này.</p>
              ) : (
                <ul className="space-y-3">
                  {filteredMatches.map((match) => {
                    const row = draft[match.id] ?? { score1: '', score2: '' }
                    return (
                      <li
                        key={match.id}
                        className={`rounded-xl border p-3 ${
                          match.completed
                            ? 'border-secondary-200 bg-secondary-50/60'
                            : 'border-neutral-200 bg-white'
                        }`}
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                          <span className="rounded bg-neutral-800 px-2 py-0.5 font-semibold text-white">
                            Vòng {match.round}
                          </span>
                          <span className="rounded bg-neutral-100 px-2 py-0.5 font-medium text-neutral-700">
                            Sân {match.court}
                          </span>
                          {match.completed && (
                            <span className="rounded bg-primary-600 px-2 py-0.5 font-semibold text-white">
                              Đã có KQ
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
                          <div>
                            <p className="text-sm font-medium text-neutral-800">
                              {pairLabel(match.pair1Id)}
                            </p>
                            <input
                              type="number"
                              min={0}
                              value={row.score1}
                              onChange={(e) => updateScore(match.id, 'score1', e.target.value)}
                              placeholder="Điểm"
                              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
                            />
                          </div>
                          <div className="hidden text-center text-xs font-bold text-neutral-400 sm:block">
                            VS
                          </div>
                          <div>
                            <p className="text-sm font-medium text-neutral-800">
                              {pairLabel(match.pair2Id)}
                            </p>
                            <input
                              type="number"
                              min={0}
                              value={row.score2}
                              onChange={(e) => updateScore(match.id, 'score2', e.target.value)}
                              placeholder="Điểm"
                              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
                            />
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}

              {error && (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-6 py-4">
              <p className="text-xs text-neutral-500">
                {filteredMatches.length} trận
                {pendingResults.length > 0
                  ? ` · sẽ lưu ${pendingResults.length} kết quả`
                  : ''}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveClick}
                  disabled={filteredMatches.length === 0}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  Lưu tất cả
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="px-6 py-6">
            <h3 className="text-lg font-semibold text-neutral-900">Xác nhận lưu kết quả</h3>
            <p className="mt-3 text-sm text-neutral-600">
              Lưu {pendingResults.length} kết quả
              {selectedGroup ? ` cho ${selectedGroup}` : ''}? Các trận chưa điền sẽ giữ nguyên.
            </p>
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
          </div>
        )}
      </div>
    </div>
  )
}
