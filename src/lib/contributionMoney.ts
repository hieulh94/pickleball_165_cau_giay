export function parseContributionAmountInput(value: string): number {
  const digits = value.replace(/\D/g, '')
  if (!digits) return 0
  const amount = Number(digits)
  if (!Number.isFinite(amount) || amount < 0) return 0
  return amount
}

/** Đơn vị nhập trên UI: bỏ 3 số 0 (20 = 20.000đ). */
export const CONTRIBUTION_INPUT_SCALE = 1_000

/** Số lưu (đồng) → số hiện trên ô nhập (nghìn). */
export function toContributionInputUnits(amountDong: number): number {
  if (!Number.isFinite(amountDong) || amountDong <= 0) return 0
  return Math.round(amountDong / CONTRIBUTION_INPUT_SCALE)
}

/** Số trên ô nhập (nghìn) → số lưu (đồng). */
export function fromContributionInputUnits(inputUnits: number): number {
  if (!Number.isFinite(inputUnits) || inputUnits <= 0) return 0
  return Math.round(inputUnits) * CONTRIBUTION_INPUT_SCALE
}

/** Parse ô nhập (nghìn) → đồng. */
export function parseContributionInputToDong(value: string): number {
  return fromContributionInputUnits(parseContributionAmountInput(value))
}

export function formatContributionAmount(amount: number): string {
  return amount.toLocaleString('vi-VN')
}

export type ContributionCompactUnit = 'beer' | 'million' | 'none'

export interface ContributionCompactParts {
  value: string
  unit: ContributionCompactUnit
}

export function getContributionAmountCompactParts(amount: number): ContributionCompactParts {
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000
    return {
      value: Number.isInteger(millions) ? `${millions}` : `${millions.toFixed(1)}`,
      unit: 'million',
    }
  }
  if (amount >= 1_000) {
    const thousands = amount / 1_000
    return {
      value: Number.isInteger(thousands) ? `${thousands}` : `${thousands.toFixed(1)}`,
      unit: 'beer',
    }
  }
  return { value: String(amount), unit: 'none' }
}

export function formatContributionAmountCompact(amount: number): string {
  const parts = getContributionAmountCompactParts(amount)
  if (parts.unit === 'million') return `${parts.value}tr`
  if (parts.unit === 'beer') return parts.value
  return parts.value
}

/** Bậc cách nhau giữa các hạng beer (đồng). Top 1 = 0; Top k đóng hơn Top k-1 đúng mức này. */
export const BEER_POOL_RANK_STEP = 20_000

/**
 * Tổng tối thiểu với N đội — chỉ Top 1 miễn phí.
 * Top2 tối thiểu = 20k, rồi mỗi bậc +20k.
 * 4 đội: 20k+40k+60k = 120.000đ.
 */
export function minBeerPoolTotal(teamCount: number): number {
  if (teamCount < 2) return 0
  const paying = teamCount - 1
  const triangular = (paying * (paying - 1)) / 2
  const minTop2 = BEER_POOL_RANK_STEP
  return paying * minTop2 + BEER_POOL_RANK_STEP * triangular
}

/**
 * Chia tổng quỹ beer theo hạng đội.
 * Top 1 = 0. Top 2 trở đi đều phải đóng; mỗi bậc cách ~`BEER_POOL_RANK_STEP` (20k).
 * Tổng các mức đội = đúng `totalAmount` (cộng 1đ vào đội cuối nếu cần).
 *
 * @returns mảng index 0 = Top 1, index 1 = Top 2, …
 */
export function splitBeerPoolByRank(teamCount: number, totalAmount: number): number[] {
  const step = BEER_POOL_RANK_STEP
  const amounts = Array.from({ length: Math.max(0, teamCount) }, () => 0)
  if (teamCount < 2 || !Number.isFinite(totalAmount) || totalAmount <= 0) {
    return amounts
  }

  const total = Math.round(totalAmount)
  const paying = teamCount - 1
  const triangular = (paying * (paying - 1)) / 2
  const minTop2 = step
  const minTotal = paying * minTop2 + step * triangular
  if (total < minTotal) {
    throw new Error(
      `Tổng tối thiểu với ${teamCount} đội là ${minTotal.toLocaleString('vi-VN')}đ (chỉ Top 1 miễn; Top 2 trở đi cách nhau ${step.toLocaleString('vi-VN')}đ).`,
    )
  }

  // paying * base + step * triangular + remainder = total, remainder ∈ [0, paying)
  // base = mức Top 2 (≥ 20k)
  const base = Math.floor((total - step * triangular) / paying)
  const assigned = paying * base + step * triangular
  const remainder = total - assigned

  for (let i = 0; i < paying; i++) {
    amounts[i + 1] = base + i * step
  }
  // Cộng 1đ vào các đội cuối để tổng đúng bằng số nhập (lệch bậc tối đa 1đ).
  for (let j = 0; j < remainder; j++) {
    amounts[teamCount - 1 - j] += 1
  }
  return amounts
}

/** Tổng các mức đã chia (bỏ Top 1 = 0). */
export function sumBeerPoolAmounts(amounts: number[]): number {
  return amounts.reduce((sum, amount) => sum + amount, 0)
}
