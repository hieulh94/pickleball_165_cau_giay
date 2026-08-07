import { useEffect, useMemo, useState } from 'react'
import {
  BEER_POOL_RANK_STEP,
  formatContributionAmount,
  minBeerPoolTotal,
  parseContributionAmountInput,
  parseContributionInputToDong,
  splitBeerPoolByRank,
  sumBeerPoolAmounts,
  toContributionInputUnits,
} from '../lib/contributionMoney'
import { getPairLabel } from '../lib/pairing'
import { getParticipantGender } from '../lib/participantGender'
import { ContributionAmount } from './leaderboard/ContributionCompactAmount'
import { SkillLevelBadge } from './SkillLevelBadge'
import type { Pair, Participant } from '../types'

interface ContributionDialogProps {
  open: boolean
  participants: Participant[]
  participantContributions?: Record<string, number>
  /** Cặp đôi của event — dùng chia quỹ theo hạng đội */
  pairs?: Pair[]
  /** Hạng cuối theo pairId (1 = Top 1). Có thì mới áp mức vào từng người. */
  placeByPairId?: Map<string, number>
  /** Nguồn hạng: chia bảng → playoff; 1 bảng → vòng bảng */
  rankingSource?: 'playoff' | 'group'
  onClose: () => void
  onSave: (contributions: Record<string, number> | undefined) => void
}

export function ContributionDialog({
  open,
  participants,
  participantContributions,
  pairs = [],
  placeByPairId,
  rankingSource = 'playoff',
  onClose,
  onSave,
}: ContributionDialogProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [poolInput, setPoolInput] = useState('')
  const [poolAmounts, setPoolAmounts] = useState<number[] | null>(null)
  const [poolError, setPoolError] = useState<string | null>(null)

  const teamCount = pairs.length > 0 ? pairs.length : Math.floor(participants.length / 2)

  const rankedPairs = useMemo(() => {
    if (!placeByPairId || placeByPairId.size === 0) return []
    return [...pairs]
      .map((pair) => ({
        pair,
        place: placeByPairId.get(pair.id) ?? 0,
      }))
      .filter((row) => row.place > 0)
      .sort((a, b) => a.place - b.place)
  }, [pairs, placeByPairId])

  const rankedPlaceCount = useMemo(() => {
    if (rankedPairs.length === 0) return teamCount
    return Math.max(rankedPairs.length, ...rankedPairs.map((row) => row.place))
  }, [rankedPairs, teamCount])

  useEffect(() => {
    if (!open) return

    const nextDraft: Record<string, string> = {}
    for (const participant of participants) {
      const saved = participantContributions?.[participant.id]
      nextDraft[participant.id] =
        saved && saved > 0 ? String(toContributionInputUnits(saved)) : '0'
    }
    setDraft(nextDraft)

    const hasSaved = Object.values(participantContributions ?? {}).some((amount) => amount > 0)
    setEditing(!hasSaved)
    setPoolInput('')
    setPoolAmounts(null)
    setPoolError(null)
  }, [open, participants, participantContributions])

  const draftTotal = useMemo(
    () =>
      participants.reduce(
        (sum, participant) => sum + parseContributionInputToDong(draft[participant.id] ?? '0'),
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
      const amount = parseContributionInputToDong(draft[participant.id] ?? '0')
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
      nextDraft[participant.id] =
        saved && saved > 0 ? String(toContributionInputUnits(saved)) : '0'
    }
    setDraft(nextDraft)
    setEditing(true)
  }

  const handleSplitPool = () => {
    setPoolError(null)
    const total = parseContributionAmountInput(poolInput)
    if (total <= 0) {
      setPoolError('Nhập tổng số tiền quỹ beer.')
      setPoolAmounts(null)
      return
    }
    if (teamCount < 2 && rankedPlaceCount < 2) {
      setPoolError('Cần ít nhất 2 đội để chia theo hạng.')
      setPoolAmounts(null)
      return
    }
    if (rankedPairs.length === 0) {
      setPoolError(
        rankingSource === 'group'
          ? 'Cần có bảng xếp hạng vòng bảng (đã có trận) để điền vào thành viên.'
          : 'Cần có bảng xếp hạng cuối (playoff) để điền vào thành viên.',
      )
      setPoolAmounts(null)
      return
    }

    const splitCount = rankedPlaceCount
    const minTotal = minBeerPoolTotal(splitCount)
    if (total < minTotal) {
      setPoolError(
        `Tổng tối thiểu với ${splitCount} đội (bước ${formatContributionAmount(BEER_POOL_RANK_STEP)}đ) là ${formatContributionAmount(minTotal)}đ.`,
      )
      setPoolAmounts(null)
      return
    }

    let amounts: number[]
    try {
      amounts = splitBeerPoolByRank(splitCount, total)
    } catch (err) {
      setPoolError(err instanceof Error ? err.message : 'Không chia được quỹ.')
      setPoolAmounts(null)
      return
    }
    setPoolAmounts(amounts)

    const nextDraft: Record<string, string> = {}
    for (const participant of participants) {
      nextDraft[participant.id] = '0'
    }

    for (const { pair, place } of rankedPairs) {
      const teamAmount = amounts[place - 1] ?? 0
      // Chia đôi mức đội cho 2 thành viên → tổng người = tổng mức đội = số nhập.
      const share1 = Math.floor(teamAmount / 2)
      const share2 = teamAmount - share1
      nextDraft[pair.player1Id] = String(toContributionInputUnits(share1))
      nextDraft[pair.player2Id] = String(toContributionInputUnits(share2))
    }

    setDraft(nextDraft)
    setEditing(true)
  }

  const poolSum = poolAmounts ? sumBeerPoolAmounts(poolAmounts) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[min(90dvh,40rem)] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
        <div className="shrink-0 border-b border-neutral-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-neutral-900">Beer cống hiến</h3>
          <p className="mt-1 text-sm text-neutral-500">
            Nhập theo nghìn đồng (vd: 20 = 20.000đ) — dùng để tính BXH beer
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {participants.length === 0 ? (
            <p className="text-sm text-neutral-500">Thêm người tham gia trước khi nhập beer cống hiến.</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
                <p className="text-sm font-semibold text-amber-900">Chia quỹ theo hạng đội</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-800/90">
                  Chỉ Top 1 miễn phí — Top 2 trở đi đều phải đóng. Mỗi hạng sau đóng hơn hạng
                  trước {formatContributionAmount(BEER_POOL_RANK_STEP)}đ. Tổng mức các đội đúng
                  bằng số nhập ({rankedPlaceCount || teamCount} đội
                  {(rankedPlaceCount || teamCount) >= 2
                    ? ` · tối thiểu ${formatContributionAmount(minBeerPoolTotal(rankedPlaceCount || teamCount))}đ`
                    : ''}
                  ). Hạng lấy từ{' '}
                  {rankingSource === 'group'
                    ? 'bảng xếp hạng vòng bảng'
                    : 'bảng xếp hạng cuối (playoff)'}
                  . Bấm Chia mức sẽ tự điền vào từng thành viên.
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <div className="min-w-[10rem] flex-1">
                    <label className="mb-1 block text-[11px] font-medium text-amber-900">
                      Tổng quỹ (đ)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={poolInput}
                      onChange={(e) => setPoolInput(e.target.value)}
                      placeholder="VD: 280000"
                      className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSplitPool}
                    className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
                  >
                    Chia mức
                  </button>
                </div>
                {poolError && <p className="mt-2 text-xs text-red-600">{poolError}</p>}

                {poolAmounts && (
                  <div className="mt-3 overflow-hidden rounded-lg border border-amber-200 bg-white">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-amber-100 bg-amber-50/50 text-[11px] uppercase tracking-wide text-amber-800/80">
                          <th className="px-3 py-2 font-semibold">Hạng</th>
                          <th className="px-3 py-2 font-semibold">Đội</th>
                          <th className="px-3 py-2 text-right font-semibold">Mức đội</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-50">
                        {poolAmounts.map((amount, index) => {
                          const place = index + 1
                          const ranked = rankedPairs.find((row) => row.place === place)
                          return (
                            <tr key={place}>
                              <td className="px-3 py-2 font-semibold text-neutral-800">
                                Top {place}
                              </td>
                              <td className="px-3 py-2 text-neutral-600">
                                {ranked ? getPairLabel(ranked.pair, participants) : '—'}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums text-neutral-800">
                                {amount === 0 ? (
                                  <span className="text-emerald-700">0 (miễn)</span>
                                ) : (
                                  formatContributionAmount(amount)
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    <p className="border-t border-amber-100 px-3 py-2 text-xs text-amber-900/80">
                      Tổng mức đội:{' '}
                      <span className="font-semibold">{formatContributionAmount(poolSum)}đ</span>
                      {' · '}Đã điền vào danh sách bên dưới — bấm Lưu để ghi.
                    </p>
                  </div>
                )}
              </div>

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
                            <SkillLevelBadge
                              level={participant.skillLevel}
                              gender={getParticipantGender(participant)}
                              short={false}
                              className="mt-0.5"
                            />
                          )}
                        </div>
                        {editing ? (
                          <div className="flex shrink-0 items-center gap-1.5">
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
                              className="w-24 rounded-lg border border-neutral-300 px-3 py-2 text-right text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
                            />
                            <span className="text-xs font-medium text-neutral-500">×1.000đ</span>
                          </div>
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
                  Nhập theo nghìn (20 = 20.000đ). Số &gt; 0 được cộng vào BXH beer.
                </p>
              </div>
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
