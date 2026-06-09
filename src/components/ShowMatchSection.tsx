import { useMemo, useState } from 'react'
import { CollapsibleSection } from './CollapsibleSection'
import { normalizeParticipantName } from '../lib/showmatchParticipants'
import { getPairColor } from '../lib/pairColors'
import {
  canEditShowmatchInfo,
  formatScheduledAt,
  groupShowMatchesByWeek,
  toScheduledISO,
  type ShowmatchWeekGroup,
} from '../lib/showmatch'
import {
  formatGameScoresDetail,
  getShowmatchGamesWon,
} from '../lib/showmatchScoring'
import type { Match, Pair, Participant } from '../types'

const SHOWMATCH_NAME_PRESETS = ['Showmatch 1', 'Showmatch 2', 'Trận khai mạc']

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
      <p className={`text-xs font-semibold ${color.text}`}>{p1?.name ?? '—'}</p>
      <p className={`text-[10px] ${color.text} opacity-70`}>&</p>
      <p className={`text-xs font-semibold ${color.text}`}>{p2?.name ?? '—'}</p>
    </div>
  )
}

function ShowMatchCard({
  match,
  pairs,
  participants,
  pairNumberById,
  onDeleteMatch,
  onEditMatch,
  onUpdateResult,
}: {
  match: Match
  pairs: Pair[]
  participants: Participant[]
  pairNumberById: Map<string, number>
  onDeleteMatch: (matchId: string) => void
  onEditMatch: (match: Match) => void
  onUpdateResult: (match: Match) => void
}) {
  const editable = canEditShowmatchInfo(match)
  const pair1 = pairs.find((p) => p.id === match.pair1Id)
  const pair2 = pairs.find((p) => p.id === match.pair2Id)
  const pair1Number = pairNumberById.get(match.pair1Id) ?? 0
  const pair2Number = pairNumberById.get(match.pair2Id) ?? 0
  const gamesWon = getShowmatchGamesWon(match)
  const gameDetail =
    match.games && match.games.length > 0 ? formatGameScoresDetail(match.games) : null

  return (
    <div
      className={`flex flex-col rounded-2xl border p-4 shadow-sm ${
        match.completed ? 'border-fuchsia-400 bg-fuchsia-50' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="mb-3 flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-bold text-white">
            Bo3
          </span>
          {match.name && (
            <span className="rounded-lg bg-fuchsia-700 px-2.5 py-1 text-xs font-bold text-white">
              {match.name}
            </span>
          )}
          {match.scheduledAt && (
            <span className="rounded-lg bg-slate-700 px-2.5 py-1 text-xs font-bold text-white">
              {formatScheduledAt(match.scheduledAt)}
            </span>
          )}
          {match.completed && (
            <span className="rounded-lg bg-fuchsia-600 px-2.5 py-1 text-xs font-semibold text-white">
              Hoàn thành
            </span>
          )}
          {!match.completed && gamesWon && (
            <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
              Đang đấu
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDeleteMatch(match.id)}
          className="shrink-0 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
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

      {gamesWon && (
        <div className="my-3 text-center">
          <p className="text-2xl font-bold text-fuchsia-700">
            {gamesWon.score1} – {gamesWon.score2}
          </p>
          {gameDetail && <p className="mt-1 text-xs text-slate-500">{gameDetail}</p>}
          {!match.completed && gamesWon && (
            <p className="mt-0.5 text-xs text-amber-700">Đang đấu</p>
          )}
        </div>
      )}

      <div className={`mt-2 grid gap-2 ${editable ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {editable && (
          <button
            type="button"
            onClick={() => onEditMatch(match)}
            className="rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Sửa thông tin
          </button>
        )}
        <button
          type="button"
          onClick={() => onUpdateResult(match)}
          className="rounded-lg border border-fuchsia-400 bg-fuchsia-50 py-2.5 text-sm font-semibold text-fuchsia-900 hover:bg-fuchsia-100"
        >
          {match.completed ? 'Sửa kết quả' : 'Cập nhật kết quả'}
        </button>
      </div>
    </div>
  )
}

function ShowmatchWeekBlock({
  group,
  expanded,
  onToggle,
  pairs,
  participants,
  pairNumberById,
  onDeleteMatch,
  onEditMatch,
  onUpdateResult,
}: {
  group: ShowmatchWeekGroup
  expanded: boolean
  onToggle: () => void
  pairs: Pair[]
  participants: Participant[]
  pairNumberById: Map<string, number>
  onDeleteMatch: (matchId: string) => void
  onEditMatch: (match: Match) => void
  onUpdateResult: (match: Match) => void
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition hover:bg-slate-50"
      >
        <span className="text-sm text-slate-400">{expanded ? '▼' : '▶'}</span>
        <div className="min-w-0 flex-1">
          {group.weekKey === 'no-date' ? (
            <p className="text-sm font-semibold text-slate-800">{group.weekLabel}</p>
          ) : (
            <p className="text-sm font-semibold text-slate-800">
              Tuần {group.weekNumber}
              <span className="font-normal text-slate-500"> · {group.weekLabel}</span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {group.isCurrentWeek && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              Tuần này
            </span>
          )}
          {group.isPastWeek && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              Đã qua
            </span>
          )}
          <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-[10px] font-bold text-fuchsia-800">
            {group.matches.length} trận
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {group.matches.map((match) => (
              <ShowMatchCard
                key={match.id}
                match={match}
                pairs={pairs}
                participants={participants}
                pairNumberById={pairNumberById}
                onDeleteMatch={onDeleteMatch}
                onEditMatch={onEditMatch}
                onUpdateResult={onUpdateResult}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface ShowMatchSectionProps {
  pairs: Pair[]
  participants: Participant[]
  matches: Match[]
  pairNumberById: Map<string, number>
  createFormVisible: boolean
  onCreateFormToggle: () => void
  onCreateMatch: (input: {
    name: string
    scheduledAt: string
    pair1Player1: string
    pair1Player2: string
    pair2Player1: string
    pair2Player2: string
  }) => void
  onDeleteMatch: (matchId: string) => void
  onEditMatch: (match: Match) => void
  onUpdateResult: (match: Match) => void
}

export function ShowMatchSection({
  pairs,
  participants,
  matches,
  pairNumberById,
  createFormVisible,
  onCreateFormToggle,
  onCreateMatch,
  onDeleteMatch,
  onEditMatch,
  onUpdateResult,
}: ShowMatchSectionProps) {
  const today = new Date().toISOString().slice(0, 10)
  const [name, setName] = useState('')
  const [date, setDate] = useState(today)
  const [time, setTime] = useState('06:00')
  const [pair1Player1, setPair1Player1] = useState('')
  const [pair1Player2, setPair1Player2] = useState('')
  const [pair2Player1, setPair2Player1] = useState('')
  const [pair2Player2, setPair2Player2] = useState('')

  const scheduledAt = toScheduledISO(date, time)

  const canCreate = useMemo(() => {
    const names = [pair1Player1, pair1Player2, pair2Player1, pair2Player2].map(
      normalizeParticipantName,
    )
    if (names.some((n) => !n) || scheduledAt === null) return false
    if (names[0] === names[1] || names[2] === names[3]) return false
    return true
  }, [pair1Player1, pair1Player2, pair2Player1, pair2Player2, scheduledAt])

  const handleCreate = () => {
    if (!canCreate || !scheduledAt) return

    onCreateMatch({
      name: name.trim(),
      scheduledAt,
      pair1Player1,
      pair1Player2,
      pair2Player1,
      pair2Player2,
    })
    setName('')
    setPair1Player1('')
    setPair1Player2('')
    setPair2Player1('')
    setPair2Player2('')
  }

  const weekGroups = useMemo(() => groupShowMatchesByWeek(matches), [matches])
  const [weekToggles, setWeekToggles] = useState<Map<string, boolean>>(() => new Map())

  const isWeekExpanded = (group: ShowmatchWeekGroup) => {
    if (weekToggles.has(group.weekKey)) return weekToggles.get(group.weekKey)!
    return !group.isPastWeek
  }

  const toggleWeek = (group: ShowmatchWeekGroup) => {
    setWeekToggles((prev) => {
      const next = new Map(prev)
      next.set(group.weekKey, !isWeekExpanded(group))
      return next
    })
  }

  return (
    <div className="space-y-6">
      <CollapsibleSection
        title="Lịch showmatch"
        description="Tạo trận với ngày giờ và tên người chơi"
        visible={createFormVisible}
        onToggle={onCreateFormToggle}
        className="mt-0"
      >
        <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50/50 p-4 sm:p-5">
        <h4 className="text-sm font-semibold text-fuchsia-900">Tạo trận showmatch</h4>
        <p className="mt-1 text-xs text-fuchsia-800">
          Nhập tên 4 người chơi (2 cặp), ngày giờ — kèo Bo3 (chạm 2).
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Tên trận (tùy chọn)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              list="showmatch-name-presets"
              placeholder="VD: Showmatch 1"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
            />
            <datalist id="showmatch-name-presets">
              {SHOWMATCH_NAME_PRESETS.map((preset) => (
                <option key={preset} value={preset} />
              ))}
            </datalist>
            <div className="mt-2 flex flex-wrap gap-2">
              {SHOWMATCH_NAME_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setName(preset)}
                  className="rounded-full border border-fuchsia-300 bg-white px-2.5 py-1 text-xs font-medium text-fuchsia-800 hover:bg-fuchsia-100"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Ngày</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Giờ</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-fuchsia-200 bg-white p-3">
              <p className="text-xs font-semibold text-fuchsia-900">Cặp 1</p>
              <div className="mt-2 space-y-2">
                <input
                  type="text"
                  value={pair1Player1}
                  onChange={(e) => setPair1Player1(e.target.value)}
                  placeholder="Người chơi 1"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                />
                <input
                  type="text"
                  value={pair1Player2}
                  onChange={(e) => setPair1Player2(e.target.value)}
                  placeholder="Người chơi 2"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                />
              </div>
            </div>

            <div className="rounded-xl border border-fuchsia-200 bg-white p-3">
              <p className="text-xs font-semibold text-fuchsia-900">Cặp 2</p>
              <div className="mt-2 space-y-2">
                <input
                  type="text"
                  value={pair2Player1}
                  onChange={(e) => setPair2Player1(e.target.value)}
                  placeholder="Người chơi 1"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                />
                <input
                  type="text"
                  value={pair2Player2}
                  onChange={(e) => setPair2Player2(e.target.value)}
                  placeholder="Người chơi 2"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Nhập tên trực tiếp — cùng một người có thể tham gia nhiều trận khác nhau.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreate}
          disabled={!canCreate}
          className="mt-4 w-full rounded-lg bg-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-fuchsia-700 disabled:opacity-50 sm:w-auto"
        >
          + Tạo trận showmatch
        </button>

        </div>
      </CollapsibleSection>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Lịch thi đấu</h3>

        {matches.length === 0 ? (
          <p className="mt-4 text-center text-sm text-slate-500">Chưa có trận showmatch nào.</p>
        ) : (
          <div className="mt-4 space-y-3">
          {weekGroups.map((group) => (
            <ShowmatchWeekBlock
              key={group.weekKey}
              group={group}
              expanded={isWeekExpanded(group)}
              onToggle={() => toggleWeek(group)}
              pairs={pairs}
              participants={participants}
              pairNumberById={pairNumberById}
              onDeleteMatch={onDeleteMatch}
              onEditMatch={onEditMatch}
              onUpdateResult={onUpdateResult}
            />
          ))}
          </div>
        )}
      </section>
    </div>
  )
}
