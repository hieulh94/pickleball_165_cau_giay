export function parseContributionAmountInput(value: string): number {
  const digits = value.replace(/\D/g, '')
  if (!digits) return 0
  const amount = Number(digits)
  if (!Number.isFinite(amount) || amount < 0) return 0
  return amount
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

/** Bậc cách nhau giữa các hạng beer. Top 1 = 0; Top k đóng hơn Top k-1 đúng mức này. */
export const BEER_POOL_RANK_STEP = 20

/**
 * Tổng tối thiểu với N đội — chỉ Top 1 miễn phí.
 * Top2 tối thiểu = 20, rồi mỗi bậc +20.
 * 4 đội: 20+40+60 = 120.
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
 * Top 1 = 0. Top 2 trở đi đều phải đóng; mỗi bậc cách `BEER_POOL_RANK_STEP` (20).
 * Tổng các mức đội = đúng `totalAmount`.
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
      `Tổng tối thiểu với ${teamCount} đội là ${minTotal} (chỉ Top 1 miễn; Top 2 trở đi cách nhau ${step}).`,
    )
  }

  const base = Math.floor((total - step * triangular) / paying)
  const assigned = paying * base + step * triangular
  const remainder = total - assigned

  for (let i = 0; i < paying; i++) {
    amounts[i + 1] = base + i * step
  }
  for (let j = 0; j < remainder; j++) {
    amounts[teamCount - 1 - j] += 1
  }
  return amounts
}

/** Tổng các mức đã chia (bỏ Top 1 = 0). */
export function sumBeerPoolAmounts(amounts: number[]): number {
  return amounts.reduce((sum, amount) => sum + amount, 0)
}
