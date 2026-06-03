import { useMemo, useState } from 'react'
import { getPairLabel } from '../lib/pairing'
import { getPairColor } from '../lib/pairColors'
import {
  buildPairStandingLookup,
  comparePairsByStanding,
  formatPairStandingDetail,
  formatPairStandingShort,
  type GroupStandings,
  type PairStandingInfo,
} from '../lib/standings'
import type { Match, Pair, Participant } from '../types'

const PLAYOFF_NAME_PRESETS = ['Tứ kết', 'Bán kết', 'Chung kết']

function PairStandingHint({
  pairId,
  standingByPairId,
  splitGroups,
}: {
  pairId: string
  standingByPairId: Map<string, PairStandingInfo>
  splitGroups: boolean
}) {
  if (!pairId) return null

  const detail = formatPairStandingDetail(standingByPairId.get(pairId), splitGroups)
  if (!detail) return null

  const info = standingByPairId.get(pairId)
  const isTop = info && info.played > 0 && info.rank === 1

  return (
    <p
      className={`mt-1.5 rounded-lg px-2.5 py-2 text-xs leading-relaxed ${
        isTop
          ? 'border border-amber-200 bg-amber-50 text-amber-900'
          : 'border border-violet-100 bg-white text-slate-600'
      }`}
    >
      {detail}
    </p>
  )
}

interface PlayoffSectionProps {
  pairs: Pair[]
  participants: Participant[]
  courts: number[]
  matches: Match[]
  standingsGroups: GroupStandings[]
  splitGroups: boolean
  pairNumberById: Map<string, number>
  onCreateMatch: (input: {
    name: string
    court: number
    pair1Id: string
    pair2Id: string
  }) => void
  onDeleteMatch: (matchId: string) => void
  onUpdateResult: (match: Match) => void
}

function PairMiniCard({
  pair,
  pairNumber,
  participants,
}: {
  pair: Pair | undefined
  pairNumber: number
  participants: Participant[]
}) {
  if (!pair || pairNumber < 1) {
    return (
      <div className="flex min-h-[5rem] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
        —
      </div>
    )
  }

  const color = getPairColor(pairNumber)
  const p1 = participants.find((p) => p.id === pair.player1Id)
  const p2 = participants.find((p) => p.id === pair.player2Id)

  return (
    <div
      className={`flex min-h-[5rem] flex-col items-center justify-center rounded-xl border-2 px-2 py-2 text-center ${color.border} ${color.bg}`}
    >
      <p className={`text-xs font-bold ${color.text}`}>Cặp {pairNumber}</p>
      <p className={`mt-1 text-xs font-semibold ${color.text}`}>{p1?.name ?? '—'}</p>
      <p className={`text-[10px] ${color.text} opacity-70`}>&</p>
      <p className={`text-xs font-semibold ${color.text}`}>{p2?.name ?? '—'}</p>
    </div>
  )
}

export function PlayoffSection({
  pairs,
  participants,
  courts,
  matches,
  standingsGroups,
  splitGroups,
  pairNumberById,
  onCreateMatch,
  onDeleteMatch,
  onUpdateResult,
}: PlayoffSectionProps) {
  const [name, setName] = useState('')
  const [court, setCourt] = useState('')
  const [pair1Id, setPair1Id] = useState('')
  const [pair2Id, setPair2Id] = useState('')

  const standingByPairId = useMemo(
    () => buildPairStandingLookup(standingsGroups),
    [standingsGroups],
  )

  const canCreate =
    name.trim().length > 0 &&
    courts.length > 0 &&
    court !== '' &&
    pair1Id !== '' &&
    pair2Id !== '' &&
    pair1Id !== pair2Id

  const handleCreate = () => {
    if (!canCreate) return
    const courtNum = parseInt(court, 10)
    if (Number.isNaN(courtNum) || !courts.includes(courtNum)) return

    onCreateMatch({
      name: name.trim(),
      court: courtNum,
      pair1Id,
      pair2Id,
    })
    setName('')
    setPair1Id('')
    setPair2Id('')
  }

  const pairOptions = useMemo(() => {
    return [...pairs]
      .sort((a, b) =>
        comparePairsByStanding(a.id, b.id, standingByPairId, splitGroups),
      )
      .map((pair) => {
        const num = pairNumberById.get(pair.id) ?? 0
        const standingShort = formatPairStandingShort(
          standingByPairId.get(pair.id),
          splitGroups,
        )
        const pairLabel = `Cặp ${num} — ${getPairLabel(pair, participants)}`
        return {
          id: pair.id,
          label: standingShort ? `${standingShort} — ${pairLabel}` : pairLabel,
        }
      })
  }, [pairs, pairNumberById, standingByPairId, splitGroups, participants])

  return (
    <div className="space-y-6">
      <p className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
        Trận vòng loại trực tiếp (tứ kết, bán kết, chung kết…) không ảnh hưởng bảng xếp
        hạng vòng bảng.
      </p>

      <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 sm:p-5">
        <h4 className="text-sm font-semibold text-violet-900">Tạo trận đấu mới</h4>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Tên trận (VD: Tứ kết, Bán kết, Chung kết)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              list="playoff-name-presets"
              placeholder="Nhập tên trận"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
            <datalist id="playoff-name-presets">
              {PLAYOFF_NAME_PRESETS.map((preset) => (
                <option key={preset} value={preset} />
              ))}
            </datalist>
            <div className="mt-2 flex flex-wrap gap-2">
              {PLAYOFF_NAME_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setName(preset)}
                  className="rounded-full border border-violet-300 bg-white px-2.5 py-1 text-xs font-medium text-violet-800 hover:bg-violet-100"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Sân</label>
            <select
              value={court}
              onChange={(e) => setCourt(e.target.value)}
              disabled={courts.length === 0}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:bg-slate-100"
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
                onChange={(e) => setPair1Id(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="">Chọn cặp</option>
                {pairOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <PairStandingHint
                pairId={pair1Id}
                standingByPairId={standingByPairId}
                splitGroups={splitGroups}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Cặp 2</label>
              <select
                value={pair2Id}
                onChange={(e) => setPair2Id(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="">Chọn cặp</option>
                {pairOptions
                  .filter((opt) => opt.id !== pair1Id)
                  .map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
              </select>
              <PairStandingHint
                pairId={pair2Id}
                standingByPairId={standingByPairId}
                splitGroups={splitGroups}
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreate}
          disabled={!canCreate}
          className="mt-4 w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 sm:w-auto"
        >
          + Tạo trận
        </button>
      </div>

      {matches.length === 0 ? (
        <p className="text-center text-sm text-slate-500">Chưa có trận vòng loại trực tiếp.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {matches.map((match) => {
            const pair1 = pairs.find((p) => p.id === match.pair1Id)
            const pair2 = pairs.find((p) => p.id === match.pair2Id)
            const pair1Number = pairNumberById.get(match.pair1Id) ?? 0
            const pair2Number = pairNumberById.get(match.pair2Id) ?? 0

            return (
              <div
                key={match.id}
                className={`flex flex-col rounded-2xl border p-4 shadow-sm ${
                  match.completed
                    ? 'border-violet-400 bg-violet-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-violet-700 px-2.5 py-1 text-xs font-bold text-white">
                      {match.name || 'Playoff'}
                    </span>
                    <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-bold text-white">
                      Sân {match.court}
                    </span>
                    {match.completed && (
                      <span className="rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white">
                        Hoàn thành
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteMatch(match.id)}
                    className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Xóa
                  </button>
                </div>

                <div className="grid flex-1 grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)] items-stretch gap-2">
                  <PairMiniCard pair={pair1} pairNumber={pair1Number} participants={participants} />
                  <div className="flex items-center justify-center">
                    <span className="text-[10px] font-bold text-slate-500">VS</span>
                  </div>
                  <PairMiniCard pair={pair2} pairNumber={pair2Number} participants={participants} />
                </div>

                {match.completed && (
                  <p className="my-3 text-center text-2xl font-bold text-violet-700">
                    {match.score1} – {match.score2}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => onUpdateResult(match)}
                  className="mt-2 w-full rounded-lg border border-violet-400 bg-violet-50 py-2.5 text-sm font-semibold text-violet-900 hover:bg-violet-100"
                >
                  {match.completed ? 'Sửa kết quả' : 'Cập nhật kết quả'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
