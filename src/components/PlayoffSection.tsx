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
import {
  canRegeneratePlayoff,
  calculateFinalRankings,
  countCompletedGroupMatches,
  describePlayoffPreview,
  expectedFinalPlaceCount,
  isAutoPlayoffMatch,
  isFinalRankingComplete,
  isGroupStageComplete,
} from '../lib/playoffBracket'
import type { Match, Pair, Participant, PlayoffConfig } from '../types'

const PLAYOFF_NAME_PRESETS = ['Tứ kết', 'Bán kết', 'Chung kết']

function formatSourceLabel(source?: string): string {
  if (!source) return 'Chờ đội'
  if (source.startsWith('W:')) return 'Thắng trận trước'
  if (source.startsWith('L:')) return 'Thua trận trước'
  return source
}

function PairStandingHint({
  pairId,
  pairGroup,
  standingByPairId,
  splitGroups,
}: {
  pairId: string
  pairGroup?: string | null
  standingByPairId: Map<string, PairStandingInfo>
  splitGroups: boolean
}) {
  if (!pairId) return null

  const detail = formatPairStandingDetail(
    standingByPairId.get(pairId),
    splitGroups,
    pairGroup,
  )
  if (!detail) return null

  const info = standingByPairId.get(pairId)
  const isTop = info && info.played > 0 && info.rank === 1

  return (
    <p
      className={`mt-1.5 rounded-lg px-2.5 py-2 text-xs leading-relaxed ${
        isTop
          ? 'border border-amber-200 bg-amber-50 text-amber-900'
          : 'border border-primary-100 bg-white text-neutral-600'
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
  groupMatches: Match[]
  standingsGroups: GroupStandings[]
  splitGroups: boolean
  pairNumberById: Map<string, number>
  playoffConfig?: PlayoffConfig
  readOnly?: boolean
  onSaveConfig: (config: PlayoffConfig) => void
  onGenerateBracket: () => void
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
  sourceLabel,
}: {
  pair: Pair | undefined
  pairNumber: number
  participants: Participant[]
  sourceLabel?: string
}) {
  if (!pair || pairNumber < 1) {
    return (
      <div className="flex min-h-[5rem] flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-2 text-center text-sm text-neutral-400">
        <span>{sourceLabel ? formatSourceLabel(sourceLabel) : 'Chờ đội'}</span>
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
      {sourceLabel && !sourceLabel.startsWith('W:') && !sourceLabel.startsWith('L:') && (
        <p className={`text-[10px] font-bold uppercase tracking-wide opacity-70 ${color.text}`}>
          {sourceLabel}
        </p>
      )}
      <p className={`text-xs font-bold ${color.text}`}>Cặp {pairNumber}</p>
      <p className={`mt-1 text-xs font-semibold ${color.text}`}>{p1?.name ?? '—'}</p>
      <p className={`text-[10px] ${color.text} opacity-70`}>&</p>
      <p className={`text-xs font-semibold ${color.text}`}>{p2?.name ?? '—'}</p>
    </div>
  )
}

function MatchCard({
  match,
  pairs,
  participants,
  pairNumberById,
  readOnly,
  onDeleteMatch,
  onUpdateResult,
}: {
  match: Match
  pairs: Pair[]
  participants: Participant[]
  pairNumberById: Map<string, number>
  readOnly: boolean
  onDeleteMatch: (matchId: string) => void
  onUpdateResult: (match: Match) => void
}) {
  const pair1 = match.pair1Id ? pairs.find((p) => p.id === match.pair1Id) : undefined
  const pair2 = match.pair2Id ? pairs.find((p) => p.id === match.pair2Id) : undefined
  const pair1Number = match.pair1Id ? (pairNumberById.get(match.pair1Id) ?? 0) : 0
  const pair2Number = match.pair2Id ? (pairNumberById.get(match.pair2Id) ?? 0) : 0
  const canEnterResult = Boolean(match.pair1Id && match.pair2Id)

  return (
    <div
      className={`flex flex-col rounded-2xl border p-4 shadow-sm ${
        match.completed
          ? 'border-primary-300 bg-primary-50'
          : 'border-neutral-200 bg-white'
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-primary-700 px-2.5 py-1 text-xs font-bold text-white">
            {match.name || 'Playoff'}
          </span>
          <span className="rounded-lg bg-neutral-800 px-2.5 py-1 text-xs font-bold text-white">
            Sân {match.court}
          </span>
          {match.completed && (
            <span className="rounded-lg bg-primary-600 px-2.5 py-1 text-xs font-semibold text-white">
              Hoàn thành
            </span>
          )}
        </div>
        {!readOnly && !isAutoPlayoffMatch(match) && (
          <button
            type="button"
            onClick={() => onDeleteMatch(match.id)}
            className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Xóa
          </button>
        )}
      </div>

      <div className="grid flex-1 grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)] items-stretch gap-2">
        <PairMiniCard
          pair={pair1}
          pairNumber={pair1Number}
          participants={participants}
          sourceLabel={match.pair1Source}
        />
        <div className="flex items-center justify-center">
          <span className="text-[10px] font-bold text-neutral-500">VS</span>
        </div>
        <PairMiniCard
          pair={pair2}
          pairNumber={pair2Number}
          participants={participants}
          sourceLabel={match.pair2Source}
        />
      </div>

      {match.completed && (
        <p className="my-3 text-center text-2xl font-bold text-primary-700">
          {match.score1} – {match.score2}
        </p>
      )}

      {!readOnly && (
        <button
          type="button"
          onClick={() => onUpdateResult(match)}
          disabled={!canEnterResult}
          className="mt-2 w-full rounded-lg border border-primary-300 bg-primary-50 py-2.5 text-sm font-semibold text-primary-800 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {match.completed ? 'Sửa kết quả' : 'Cập nhật kết quả'}
        </button>
      )}
    </div>
  )
}

export function PlayoffSection({
  pairs,
  participants,
  courts,
  matches,
  groupMatches,
  standingsGroups,
  splitGroups,
  pairNumberById,
  playoffConfig,
  readOnly = false,
  onSaveConfig,
  onGenerateBracket,
  onCreateMatch,
  onDeleteMatch,
  onUpdateResult,
}: PlayoffSectionProps) {
  const [name, setName] = useState('')
  const [court, setCourt] = useState('')
  const [pair1Id, setPair1Id] = useState('')
  const [pair2Id, setPair2Id] = useState('')
  const [showManual, setShowManual] = useState(false)

  const groupCount = standingsGroups.filter((g) => g.group).length
  const pairsPerGroup =
    groupCount > 0
      ? Math.min(...standingsGroups.filter((g) => g.group).map((g) => g.standings.length))
      : 0

  const defaultA = Math.min(2, Math.max(1, Math.floor(pairsPerGroup / 2) || 1))
  const defaultB = Math.max(0, pairsPerGroup - defaultA)

  const [slotsA, setSlotsA] = useState(
    () => playoffConfig?.championshipSlotsPerGroup ?? defaultA,
  )
  const [slotsB, setSlotsB] = useState(
    () => playoffConfig?.placementSlotsPerGroup ?? defaultB,
  )

  const standingByPairId = useMemo(() => {
    const map = buildPairStandingLookup(standingsGroups)
    if (!splitGroups) return map

    for (const pair of pairs) {
      if (!pair.group) continue
      const row = map.get(pair.id)
      if (row) {
        map.set(pair.id, { ...row, group: row.group ?? pair.group })
      }
    }
    return map
  }, [standingsGroups, pairs, splitGroups])

  const groupProgress = countCompletedGroupMatches(groupMatches)
  const groupComplete = isGroupStageComplete(groupMatches)
  const autoMatches = matches.filter(isAutoPlayoffMatch)
  const manualMatches = matches.filter((m) => !isAutoPlayoffMatch(m))
  const canRegen = canRegeneratePlayoff(matches)
  const configSaved = playoffConfig != null
  const preview = describePlayoffPreview(groupCount, pairsPerGroup, slotsA, slotsB)

  const championshipMatches = autoMatches.filter((m) => m.playoffBracket === 'championship')
  const placementMatches = autoMatches.filter((m) => m.playoffBracket === 'placement')
  const finalRankings = useMemo(() => calculateFinalRankings(matches), [matches])
  const finalRankingComplete = useMemo(() => isFinalRankingComplete(matches), [matches])
  const expectedPlaces = useMemo(() => expectedFinalPlaceCount(matches), [matches])

  const groupByRound = (list: Match[]) => {
    const map = new Map<number, Match[]>()
    for (const m of list) {
      const r = m.playoffRound ?? 0
      const arr = map.get(r) ?? []
      arr.push(m)
      map.set(r, arr)
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }

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

  const handleSaveConfig = () => {
    onSaveConfig({
      championshipSlotsPerGroup: slotsA,
      placementSlotsPerGroup: slotsB,
      status: playoffConfig?.status === 'generated' ? 'generated' : 'configured',
    })
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
          pair.group,
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
      <p className="rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-800">
        Cấu hình format trước; khi vòng bảng xong, bracket tự tạo từ BXH. Kết quả playoff
        không ảnh hưởng bảng xếp hạng vòng bảng.
      </p>

      {!readOnly && splitGroups && groupCount >= 2 && (
        <div className="rounded-2xl border border-primary-200 bg-primary-50/50 p-4 sm:p-5">
          <h4 className="text-sm font-semibold text-primary-800">
            Cấu hình bracket tự động
          </h4>
          <p className="mt-1 text-xs text-primary-700">
            a = suất tranh giải mỗi bảng · b = suất tranh hạng mỗi bảng
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-700">
                a — tranh giải / bảng
              </label>
              <input
                type="number"
                min={1}
                max={Math.max(1, pairsPerGroup)}
                value={slotsA}
                onChange={(e) => setSlotsA(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-700">
                b — tranh hạng / bảng
              </label>
              <input
                type="number"
                min={0}
                max={Math.max(0, pairsPerGroup)}
                value={slotsB}
                onChange={(e) => setSlotsB(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
              />
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-neutral-600">{preview}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSaveConfig}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Lưu cấu hình
            </button>
            {configSaved && groupComplete && canRegen && (
              <button
                type="button"
                onClick={onGenerateBracket}
                className="rounded-lg border border-primary-300 bg-white px-4 py-2 text-sm font-semibold text-primary-800 hover:bg-primary-50"
              >
                {autoMatches.length > 0 ? 'Tạo lại bracket' : 'Tạo bracket từ BXH'}
              </button>
            )}
          </div>

          <p className="mt-3 text-xs text-neutral-600">
            Vòng bảng:{' '}
            <span className="font-semibold text-neutral-800">
              {groupProgress.completed}/{groupProgress.total}
            </span>
            {groupComplete ? ' — đã xong' : ' — chưa xong'}
            {playoffConfig?.status === 'generated' && autoMatches.length > 0
              ? ' · Bracket đã tạo'
              : configSaved
                ? ' · Đã lưu cấu hình'
                : ''}
            {!canRegen && autoMatches.length > 0
              ? ' · Không tạo lại (đã có kết quả playoff)'
              : ''}
          </p>
        </div>
      )}

      {championshipMatches.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-neutral-800">Nhánh tranh giải</h4>
          {groupByRound(championshipMatches).map(([round, roundMatches]) => (
            <div key={`c-${round}`}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                Vòng {round}
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {roundMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    pairs={pairs}
                    participants={participants}
                    pairNumberById={pairNumberById}
                    readOnly={readOnly}
                    onDeleteMatch={onDeleteMatch}
                    onUpdateResult={onUpdateResult}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {placementMatches.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-neutral-800">Nhánh tranh hạng</h4>
          {groupCount === 2 ? (
            <p className="text-xs text-neutral-500">
              Cùng hạng mỗi bảng gặp nhau quyết định luôn: A3–B3 tranh 5–6, A4–B4 tranh 7–8…
            </p>
          ) : groupCount >= 3 ? (
            <p className="text-xs text-neutral-500">
              Từ 3 bảng trở lên: mỗi cùng hạng tạo mini nhánh riêng.
            </p>
          ) : null}
          {groupByRound(placementMatches).map(([round, roundMatches]) => (
            <div key={`p-${round}`}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                Vòng {round}
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {roundMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    pairs={pairs}
                    participants={participants}
                    pairNumberById={pairNumberById}
                    readOnly={readOnly}
                    onDeleteMatch={onDeleteMatch}
                    onUpdateResult={onUpdateResult}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {manualMatches.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-neutral-800">Trận tạo tay</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {manualMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                pairs={pairs}
                participants={participants}
                pairNumberById={pairNumberById}
                readOnly={readOnly}
                onDeleteMatch={onDeleteMatch}
                onUpdateResult={onUpdateResult}
              />
            ))}
          </div>
        </div>
      )}

      {matches.length === 0 && (
        <p className="text-center text-sm text-neutral-500">
          Chưa có trận vòng loại trực tiếp.
        </p>
      )}

      {finalRankings.length > 0 && (
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-neutral-800">
              Bảng xếp hạng cuối
            </h4>
            <p className="mt-0.5 text-xs text-neutral-500">
              {finalRankingComplete
                ? `Đã xác định đủ hạng 1–${expectedPlaces}`
                : `Đã có ${finalRankings.length}/${expectedPlaces || '…'} vị trí — cập nhật khi xong thêm trận tranh hạng`}
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-neutral-200">
            <table className="w-full min-w-[320px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <th className="px-4 py-3 font-semibold">Hạng</th>
                  <th className="px-4 py-3 font-semibold">Cặp đôi</th>
                  <th className="px-4 py-3 font-semibold">Cặp số</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {Array.from(
                  { length: Math.max(expectedPlaces, finalRankings.length) },
                  (_, i) => {
                    const place = i + 1
                    const row = finalRankings.find((r) => r.place === place)
                    const pair = row
                      ? pairs.find((p) => p.id === row.pairId)
                      : undefined
                    const pairNumber = row
                      ? (pairNumberById.get(row.pairId) ?? 0)
                      : 0
                    const isTop = place === 1 && !!row

                    return (
                      <tr
                        key={place}
                        className={isTop ? 'bg-primary-50/80' : 'bg-white'}
                      >
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                              isTop
                                ? 'bg-primary-600 text-white'
                                : place <= 3 && row
                                  ? 'bg-neutral-200 text-neutral-700'
                                  : 'bg-neutral-100 text-neutral-600'
                            }`}
                          >
                            {place}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-neutral-900">
                          {pair ? (
                            getPairLabel(pair, participants)
                          ) : (
                            <span className="text-neutral-400">Chưa xác định</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-neutral-600">
                          {pairNumber > 0 ? `Cặp ${pairNumber}` : '—'}
                        </td>
                      </tr>
                    )
                  },
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!readOnly && (
        <div>
          <button
            type="button"
            onClick={() => setShowManual((v) => !v)}
            className="text-sm font-medium text-primary-700 hover:underline"
          >
            {showManual ? 'Ẩn tạo trận thủ công' : 'Tạo trận thủ công…'}
          </button>

          {showManual && (
            <div className="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 sm:p-5">
              <h4 className="text-sm font-semibold text-neutral-800">Tạo trận thủ công</h4>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-700">
                    Tên trận
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    list="playoff-name-presets"
                    placeholder="Nhập tên trận"
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
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
                        className="rounded-full border border-primary-200 bg-white px-2.5 py-1 text-xs font-medium text-primary-800 hover:bg-primary-50"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-700">Sân</label>
                  <select
                    value={court}
                    onChange={(e) => setCourt(e.target.value)}
                    disabled={courts.length === 0}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20 disabled:bg-neutral-100"
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
                    <label className="mb-1 block text-xs font-medium text-neutral-700">
                      Cặp 1
                    </label>
                    <select
                      value={pair1Id}
                      onChange={(e) => setPair1Id(e.target.value)}
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
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
                      pairGroup={pairs.find((p) => p.id === pair1Id)?.group}
                      standingByPairId={standingByPairId}
                      splitGroups={splitGroups}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-700">
                      Cặp 2
                    </label>
                    <select
                      value={pair2Id}
                      onChange={(e) => setPair2Id(e.target.value)}
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
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
                      pairGroup={pairs.find((p) => p.id === pair2Id)?.group}
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
                className="mt-4 w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 sm:w-auto"
              >
                + Tạo trận
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
