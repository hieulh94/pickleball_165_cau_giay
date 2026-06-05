import { useMemo, useState } from 'react'
import { getPairLabel } from '../lib/pairing'
import type { Match, Pair, Participant } from '../types'

interface ManualSchedulePanelProps {
  pairs: Pair[]
  participants: Participant[]
  courts: number[]
  groupMatches: Match[]
  splitGroups: boolean
  pairNumberById: Map<string, number>
  onCreateMatch: (input: {
    round: number
    court: number
    pair1Id: string
    pair2Id: string
  }) => void
}

export function ManualSchedulePanel({
  pairs,
  participants,
  courts,
  groupMatches,
  splitGroups,
  pairNumberById,
  onCreateMatch,
}: ManualSchedulePanelProps) {
  const defaultRound = useMemo(() => {
    if (groupMatches.length === 0) return 1
    return Math.max(...groupMatches.map((m) => m.round))
  }, [groupMatches])

  const [round, setRound] = useState(String(defaultRound))
  const [court, setCourt] = useState('')
  const [pair1Id, setPair1Id] = useState('')
  const [pair2Id, setPair2Id] = useState('')

  const pairOptions = useMemo(() => {
    return pairs.map((pair) => {
      const num = pairNumberById.get(pair.id) ?? 0
      const groupSuffix = splitGroups && pair.group ? ` (${pair.group})` : ''
      return {
        id: pair.id,
        group: pair.group,
        label: `Cặp ${num} — ${getPairLabel(pair, participants)}${groupSuffix}`,
      }
    })
  }, [pairs, pairNumberById, splitGroups, participants])

  const pair2Options = useMemo(() => {
    if (!pair1Id) return pairOptions

    const pair1 = pairs.find((p) => p.id === pair1Id)
    if (!splitGroups || !pair1?.group) {
      return pairOptions.filter((opt) => opt.id !== pair1Id)
    }

    return pairOptions.filter(
      (opt) => opt.id !== pair1Id && opt.group === pair1.group,
    )
  }, [pairOptions, pair1Id, pairs, splitGroups])

  const canCreate =
    round !== '' &&
    parseInt(round, 10) >= 1 &&
    courts.length > 0 &&
    court !== '' &&
    pair1Id !== '' &&
    pair2Id !== '' &&
    pair1Id !== pair2Id

  const handleCreate = () => {
    if (!canCreate) return
    const roundNum = parseInt(round, 10)
    const courtNum = parseInt(court, 10)
    if (Number.isNaN(roundNum) || roundNum < 1) return
    if (Number.isNaN(courtNum) || !courts.includes(courtNum)) return

    onCreateMatch({
      round: roundNum,
      court: courtNum,
      pair1Id,
      pair2Id,
    })
    setPair1Id('')
    setPair2Id('')
  }

  const existingRounds = useMemo(() => {
    const rounds = [...new Set(groupMatches.map((m) => m.round))].sort((a, b) => a - b)
    return rounds
  }, [groupMatches])

  return (
    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 sm:p-5">
      <p className="text-xs text-emerald-900/80">
        Thêm từng trận vòng bảng: chọn vòng, sân và hai cặp đấu.
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Vòng</label>
          <input
            type="number"
            min={1}
            value={round}
            onChange={(e) => setRound(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 sm:w-32"
          />
          {existingRounds.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {existingRounds.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRound(String(r))}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                    round === String(r)
                      ? 'border-emerald-500 bg-emerald-100 text-emerald-900'
                      : 'border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  Vòng {r}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setRound(String(defaultRound + 1))}
                className="rounded-full border border-dashed border-emerald-300 bg-white px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
              >
                + Vòng mới
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Sân</label>
          <select
            value={court}
            onChange={(e) => setCourt(e.target.value)}
            disabled={courts.length === 0}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 sm:max-w-xs"
          >
            <option value="">Chọn sân</option>
            {courts.map((c) => (
              <option key={c} value={String(c)}>
                Sân {c}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Cặp 1</label>
            <select
              value={pair1Id}
              onChange={(e) => {
                setPair1Id(e.target.value)
                setPair2Id('')
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Chọn cặp</option>
              {pairOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Cặp 2</label>
            <select
              value={pair2Id}
              onChange={(e) => setPair2Id(e.target.value)}
              disabled={!pair1Id}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100"
            >
              <option value="">Chọn cặp</option>
              {pair2Options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCreate}
        disabled={!canCreate}
        className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 sm:w-auto"
      >
        + Thêm trận
      </button>
    </div>
  )
}
