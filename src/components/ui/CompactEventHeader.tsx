import { Link } from 'react-router-dom'
import { Button } from './Button'
import { DropdownMenu } from './DropdownMenu'
import { inputClassName } from './styles'
import { cn } from '../../lib/cn'

interface CompactEventHeaderProps {
  name: string
  accessCode?: string
  badge?: { label: string; className: string }
  isEditingName: boolean
  nameInput: string
  onNameInputChange: (value: string) => void
  onStartRename: () => void
  onSaveName: () => void
  onCancelRename: () => void
  onDuplicate?: () => void
  onDelete?: () => void
}

const menuItems = (
  onStartRename: () => void,
  onDuplicate: (() => void) | undefined,
  onDelete: (() => void) | undefined,
) => [
  { label: 'Đổi tên', onClick: onStartRename },
  {
    label: 'Đổi mã event',
    onClick: () => alert('Mã event được tạo tự động và không thể đổi.'),
    disabled: true,
  },
  {
    label: 'Nhân bản event',
    onClick: onDuplicate ?? (() => alert('Tính năng nhân bản sắp có.')),
    disabled: !onDuplicate,
  },
  ...(onDelete ? [{ label: 'Xóa event', onClick: onDelete, destructive: true }] : []),
]

export function CompactEventHeader({
  name,
  accessCode,
  badge,
  isEditingName,
  nameInput,
  onNameInputChange,
  onStartRename,
  onSaveName,
  onCancelRename,
  onDuplicate,
  onDelete,
}: CompactEventHeaderProps) {
  if (isEditingName) {
    return (
      <header className="flex min-h-9 flex-wrap items-center gap-2">
        <Link
          to="/"
          className="shrink-0 text-xs font-medium text-primary-600 transition hover:text-primary-700 hover:underline"
        >
          ← Danh sách
        </Link>
        <span className="hidden text-neutral-300 sm:inline" aria-hidden>
          |
        </span>
        <input
          type="text"
          value={nameInput}
          onChange={(e) => onNameInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveName()
            if (e.key === 'Escape') onCancelRename()
          }}
          className={`${inputClassName} min-w-0 flex-1 sm:max-w-xs`}
          autoFocus
        />
        <Button size="sm" onClick={onSaveName}>
          Lưu
        </Button>
        <Button size="sm" variant="secondary" onClick={onCancelRename}>
          Hủy
        </Button>
      </header>
    )
  }

  return (
    <header className="flex min-h-9 items-center gap-2 sm:gap-3">
      <Link
        to="/"
        className="shrink-0 text-xs font-medium text-primary-600 transition hover:text-primary-700 hover:underline"
      >
        ← Danh sách
      </Link>

      <span className="shrink-0 text-neutral-300" aria-hidden>
        |
      </span>

      <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
        <h1
          className="truncate text-sm font-semibold text-text-primary sm:text-base"
          title={name}
        >
          {name}
        </h1>
        <span className="shrink-0 text-neutral-300" aria-hidden>
          ·
        </span>
        <span className="shrink-0 font-mono text-xs text-text-secondary">
          #{accessCode || '—'}
        </span>
        {badge && (
          <span
            className={cn(
              'hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:inline',
              badge.className,
            )}
          >
            {badge.label}
          </span>
        )}
      </div>

      <DropdownMenu items={menuItems(onStartRename, onDuplicate, onDelete)} />
    </header>
  )
}
