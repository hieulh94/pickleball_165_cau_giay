import beerIcon from '../../assets/beer.png'
import { getContributionAmountCompactParts } from '../../lib/contributionMoney'
import { cn } from '../../lib/cn'

const DEFAULT_ICON = 'h-7 w-7 sm:h-8 sm:w-8'

function BeerMugIcon({ className }: { className?: string }) {
  return (
    <img
      src={beerIcon}
      alt=""
      aria-hidden
      className={cn('inline-block shrink-0 object-contain', className ?? DEFAULT_ICON)}
    />
  )
}

interface ContributionAmountProps {
  amount: number
  /** compact: 367.5 🍺 · full: 367.500 🍺 */
  compact?: boolean
  iconClassName?: string
  className?: string
}

export function ContributionAmount({
  amount,
  compact = true,
  iconClassName,
  className,
}: ContributionAmountProps) {
  if (!compact) {
    return (
      <span className={cn('inline-flex items-center gap-1 tabular-nums', className)}>
        <span>{amount.toLocaleString('vi-VN')}</span>
        <BeerMugIcon className={iconClassName} />
      </span>
    )
  }

  const parts = getContributionAmountCompactParts(amount)

  return (
    <span className={cn('inline-flex items-center gap-1 tabular-nums', className)}>
      <span>{parts.value}</span>
      {parts.unit === 'million' && <span className="text-[0.85em] font-semibold">tr</span>}
      <BeerMugIcon className={iconClassName} />
    </span>
  )
}

/** @deprecated Dùng ContributionAmount */
export const ContributionCompactAmount = ContributionAmount
