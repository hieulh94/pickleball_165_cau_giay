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
