import { useEffect, useMemo, useState } from 'react'
import { PlayerNameInput } from './PlayerNameInput'
import { scheduledAtToDateTimeInputs, toScheduledISO } from '../lib/showmatch'
import { getPairPlayerNames, normalizeParticipantName } from '../lib/showmatchParticipants'
import type { Match, Pair, Participant } from '../types'

const SHOWMATCH_NAME_PRESETS = ['Showmatch 1', 'Showmatch 2', 'Trận khai mạc']

interface ShowmatchEditDialogProps {
  open: boolean
  match: Match | null
  pairs: Pair[]
  participants: Participant[]
  onClose: () => void
  onSubmit: (input: {
    name: string
    scheduledAt: string
    pair1Player1: string
    pair1Player2: string
    pair2Player1: string
    pair2Player2: string
  }) => void
}

export function ShowmatchEditDialog({
  open,
  match,
  pairs,
  participants,
  onClose,
  onSubmit,
}: ShowmatchEditDialogProps) {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [pair1Player1, setPair1Player1] = useState('')
  const [pair1Player2, setPair1Player2] = useState('')
  const [pair2Player1, setPair2Player1] = useState('')
  const [pair2Player2, setPair2Player2] = useState('')

  useEffect(() => {
    if (!open || !match) return

    const { date: d, time: t } = scheduledAtToDateTimeInputs(match.scheduledAt)
    const pair1 = pairs.find((p) => p.id === match.pair1Id)
    const pair2 = pairs.find((p) => p.id === match.pair2Id)
    const [p1a, p1b] = getPairPlayerNames(pair1, participants)
    const [p2a, p2b] = getPairPlayerNames(pair2, participants)

    setName(match.name ?? '')
    setDate(d)
    setTime(t)
    setPair1Player1(p1a)
    setPair1Player2(p1b)
    setPair2Player1(p2a)
    setPair2Player2(p2b)
  }, [open, match, pairs, participants])

  const scheduledAt = toScheduledISO(date, time)

  const canSave = useMemo(() => {
    const names = [pair1Player1, pair1Player2, pair2Player1, pair2Player2].map(
      normalizeParticipantName,
    )
    if (names.some((n) => !n) || scheduledAt === null) return false
    if (names[0] === names[1] || names[2] === names[3]) return false
    return true
  }, [pair1Player1, pair1Player2, pair2Player1, pair2Player2, scheduledAt])

  if (!open || !match) return null

  const handleSave = () => {
    if (!canSave || !scheduledAt) return
    onSubmit({
      name: name.trim(),
      scheduledAt,
      pair1Player1,
      pair1Player2,
      pair2Player1,
      pair2Player2,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">Sửa thông tin trận</h3>
        <p className="mt-1 text-sm text-slate-500">
          Chỉ sửa được khi chưa có kết quả hiệp đấu nào.
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
              list="showmatch-edit-name-presets"
              placeholder="VD: Showmatch 1"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
            />
            <datalist id="showmatch-edit-name-presets">
              {SHOWMATCH_NAME_PRESETS.map((preset) => (
                <option key={preset} value={preset} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Ngày</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Giờ</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50/40 p-3">
              <p className="text-xs font-semibold text-fuchsia-900">Cặp 1</p>
              <div className="mt-2 space-y-2">
                <PlayerNameInput
                  value={pair1Player1}
                  onChange={setPair1Player1}
                  placeholder="Chọn hoặc nhập người chơi 1"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                />
                <PlayerNameInput
                  value={pair1Player2}
                  onChange={setPair1Player2}
                  placeholder="Chọn hoặc nhập người chơi 2"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                />
              </div>
            </div>

            <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50/40 p-3">
              <p className="text-xs font-semibold text-fuchsia-900">Cặp 2</p>
              <div className="mt-2 space-y-2">
                <PlayerNameInput
                  value={pair2Player1}
                  onChange={setPair2Player1}
                  placeholder="Chọn hoặc nhập người chơi 1"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                />
                <PlayerNameInput
                  value={pair2Player2}
                  onChange={setPair2Player2}
                  placeholder="Chọn hoặc nhập người chơi 2"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-medium text-white hover:bg-fuchsia-700 disabled:opacity-50"
          >
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  )
}
