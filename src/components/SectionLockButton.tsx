import { cn } from '../lib/cn'

type SectionLockButtonProps = {
  locked: boolean
  disabled?: boolean
  disabledTitle?: string
  onClick: () => void
}

export function SectionLockButton({
  locked,
  disabled = false,
  disabledTitle,
  onClick,
}: SectionLockButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledTitle : locked ? 'Đã chốt — nhập mật khẩu để mở khóa' : 'Chốt bằng mật khẩu'}
      className={cn(
        'shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap',
        disabled && 'cursor-not-allowed border-neutral-200 bg-neutral-50 text-neutral-400',
        !disabled &&
          locked &&
          'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100',
        !disabled &&
          !locked &&
          'border-neutral-300 text-neutral-700 hover:bg-neutral-50',
      )}
    >
      {locked ? '🔒 Đã chốt' : '🔓 Chốt'}
    </button>
  )
}
