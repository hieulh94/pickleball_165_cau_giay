import { useEffect, useMemo, useState } from 'react'
import {
  formatContributionAmount,
  parseContributionAmountInput,
} from '../lib/contributionMoney'
import type { Participant } from '../types'

interface ContributionDialogProps {
  open: boolean
  participants: Participant[]
  participantContributions?: Record<string, number>
  onClose: () => void
  onSave: (contributions: Record<string, number> | undefined) => void
}

export function ContributionDialog({
  open,
  participants,
  participantContributions,
  onClose,
  onSave,
}: ContributionDialogProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return

    const nextDraft: Record<string, string> = {}
    for (const participant of participants) {
      const saved = participantContributions?.[participant.id]
      nextDraft[participant.id] = saved && saved > 0 ? String(saved) : '0'
    }
    setDraft(nextDraft)

    const hasSaved = Object.values(participantContributions ?? {}).some((amount) => amount > 0)
    setEditing(!hasSaved)
  }, [open, participants, participantContributions])

  const draftTotal = useMemo(
    () =>
      participants.reduce(
        (sum, participant) => sum + parseContributionAmountInput(draft[participant.id] ?? '0'),
        0,
      ),
    [participants, draft],
  )

  const savedTotal = useMemo(
    () =>
      participants.reduce(
        (sum, participant) => sum + (participantContributions?.[participant.id] ?? 0),
        0,
      ),
    [participants, participantContributions],
  )

  if (!open) return null

  const handleSave = () => {
    const contributions: Record<string, number> = {}
    for (const participant of participants) {
      const amount = parseContributionAmountInput(draft[participant.id] ?? '0')
      if (amount > 0) {
        contributions[participant.id] = amount
      }
    }
    onSave(Object.keys(contributions).length > 0 ? contributions : undefined)
    setEditing(false)
  }

  const handleEdit = () => {
    const nextDraft: Record<string, string> = {}
    for (const participant of participants) {
      const saved = participantContributions?.[participant.id]
      nextDraft[participant.id] = saved && saved > 0 ? String(saved) : '0'
    }
    setDraft(nextDraft)
    setEditing(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[min(90dvh,40rem)] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
        <div className="shrink-0 border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">Tiền cống hiến</h3>
          <p className="mt-1 text-sm text-slate-500">
            Nhập số tiền từng người nộp — dùng để tính BXH cống hiến
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {participants.length === 0 ? (
            <p className="text-sm text-slate-500">Thêm người tham gia trước khi nhập tiền cống hiến.</p>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-emerald-900">
                  {participants.length} người tham gia
                </p>
                {editing ? (
                  <button
                    type="button"
                    onClick={handleSave}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Lưu
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Chỉnh sửa
                  </button>
                )}
              </div>

              <ul className="mt-4 divide-y divide-emerald-100 overflow-hidden rounded-xl border border-emerald-100 bg-white">
                {participants.map((participant) => {
                  const savedAmount = participantContributions?.[participant.id] ?? 0
                  return (
                    <li
                      key={participant.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {participant.name}
                        </p>
                        {!editing && (
                          <p className="text-xs text-slate-500">Trình độ {participant.skillLevel}</p>
                        )}
                      </div>
                      {editing ? (
                        <input
                          type="text"
                          inputMode="numeric"
                          value={draft[participant.id] ?? '0'}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              [participant.id]: e.target.value,
                            }))
                          }
                          className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-right text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                        />
                      ) : (
                        <span className="shrink-0 text-sm font-semibold text-emerald-800">
                          {formatContributionAmount(savedAmount)}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>

              <p className="mt-4 text-sm font-semibold text-emerald-900">
                Tổng thu: {formatContributionAmount(editing ? draftTotal : savedTotal)}
              </p>
              <p className="mt-1 text-xs text-emerald-800">
                Số tiền &gt; 0 của mỗi người sẽ được cộng vào BXH cống hiến.
              </p>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
