import { Button } from './Button'
import { inputClassNameLg } from './styles'

interface EventPageHeaderProps {
  name: string
  accessCode?: string
  badge?: { label: string; className: string }
  isEditing: boolean
  nameInput: string
  onNameInputChange: (value: string) => void
  onStartEdit: () => void
  onSave: () => void
  onCancel: () => void
}

export function EventPageHeader({
  name,
  accessCode,
  badge,
  isEditing,
  nameInput,
  onNameInputChange,
  onStartEdit,
  onSave,
  onCancel,
}: EventPageHeaderProps) {
  return (
    <div>
      {isEditing ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            value={nameInput}
            onChange={(e) => onNameInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSave()}
            className={`${inputClassNameLg} sm:max-w-md`}
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={onSave}>
              Lưu
            </Button>
            <Button size="sm" variant="secondary" onClick={onCancel}>
              Hủy
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <h2 className="text-lg font-semibold text-neutral-900 sm:text-2xl">{name}</h2>
          {badge && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
              {badge.label}
            </span>
          )}
          <Button size="sm" variant="secondary" onClick={onStartEdit}>
            Sửa tên
          </Button>
        </div>
      )}
      <p className="mt-1 text-xs text-neutral-500 sm:text-sm">
        Mã event: <span className="font-semibold text-neutral-700">{accessCode || '—'}</span>
      </p>
    </div>
  )
}
