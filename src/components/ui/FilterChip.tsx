import { cn } from '../../lib/cn'

interface FilterChipProps {
  label: string
  active: boolean
  onClick: () => void
}

export function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-8 shrink-0 rounded-full px-3 text-sm font-medium transition',
        active
          ? 'bg-neutral-900 text-white'
          : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50',
      )}
    >
      {label}
    </button>
  )
}
