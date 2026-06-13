export function parseContributionAmountInput(value: string): number {
  const digits = value.replace(/\D/g, '')
  if (!digits) return 0
  const amount = Number(digits)
  if (!Number.isFinite(amount) || amount < 0) return 0
  return amount
}

export function formatContributionAmount(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} ₫`
}

export function formatContributionAmountCompact(amount: number): string {
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000
    return Number.isInteger(millions) ? `${millions}tr` : `${millions.toFixed(1)}tr`
  }
  if (amount >= 1_000) {
    const thousands = amount / 1_000
    return Number.isInteger(thousands) ? `${thousands}k` : `${thousands.toFixed(1)}k`
  }
  return String(amount)
}
