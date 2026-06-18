import { useEffect, useMemo, useState } from 'react'
import { parseContributionAmountInput } from '../lib/contributionMoney'
import { ContributionAmount } from './leaderboard/ContributionCompactAmount'
import { SkillLevelBadge } from './SkillLevelBadge'
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
        <div className="shrink-0 border-b border-neutral-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-neutral-900">Beer cống hiến</h3>
          <p className="mt-1 text-sm text-neutral-500">
            Nhập số beer từng người nộp — dùng để tính BXH beer
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {participants.length === 0 ? (
            <p className="text-sm text-neutral-500">Thêm người tham gia trước khi nhập beer cống hiến.</p>
          ) : (
            <div className="rounded-xl border border-primary-200 bg-secondary-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-secondary-700">
                  {participants.length} người tham gia
                </p>
                {editing ? (
                  <button
                    type="button"
                    onClick={handleSave}
                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                  >
                    Lưu
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    Chỉnh sửa
                  </button>
                )}
              </div>

              <ul className="mt-4 divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white">
                {participants.map((participant) => {
                  const savedAmount = participantContributions?.[participant.id] ?? 0
                  return (
                    <li
                      key={participant.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-900">
                          {participant.name}
                        </p>
                        {!editing && (
                          <SkillLevelBadge level={participant.skillLevel} short={false} className="mt-0.5" />
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
                          className="w-32 rounded-lg border border-neutral-300 px-3 py-2 text-right text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
                        />
                      ) : (
                        <ContributionAmount
                          amount={savedAmount}
                          compact={false}
                          iconClassName="h-5 w-5"
                          className="shrink-0 text-sm font-semibold text-secondary-700"
                        />
                      )}
                    </li>
                  )
                })}
              </ul>

              <p className="mt-4 text-sm font-semibold text-secondary-700">
                Tổng beer:{' '}
                <ContributionAmount
                  amount={editing ? draftTotal : savedTotal}
                  compact={false}
                  iconClassName="h-5 w-5"
                />
              </p>
              <p className="mt-1 text-xs text-secondary-700">
                Số beer &gt; 0 của mỗi người sẽ được cộng vào BXH beer.
              </p>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-neutral-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 sm:w-auto"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
