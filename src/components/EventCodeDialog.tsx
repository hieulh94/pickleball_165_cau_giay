import { Button } from './ui/Button'
import { inputClassName } from './ui/styles'

interface EventCodeDialogProps {
  open: boolean
  title: string
  message: string
  value: string
  inputType?: 'text' | 'password' | 'number'
  placeholder?: string
  error?: string | null
  confirmLabel?: string
  secondaryConfirmLabel?: string
  inputMin?: number
  inputMax?: number
  onChange: (value: string) => void
  onConfirm: () => void
  onSecondaryConfirm?: () => void
  onCancel: () => void
}

export function EventCodeDialog({
  open,
  title,
  message,
  value,
  inputType = 'text',
  placeholder = 'Nhập mã event',
  error,
  confirmLabel = 'Xác thực',
  secondaryConfirmLabel,
  inputMin,
  inputMax,
  onChange,
  onConfirm,
  onSecondaryConfirm,
  onCancel,
}: EventCodeDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
        <p className="mt-2 text-sm text-neutral-600">{message}</p>
        <input
          type={inputType}
          value={value}
          min={inputMin}
          max={inputMax}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
          placeholder={placeholder}
          className={`mt-4 ${inputClassName}`}
          autoFocus
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            Hủy
          </Button>
          {secondaryConfirmLabel && onSecondaryConfirm ? (
            <Button variant="secondary" onClick={onSecondaryConfirm}>
              {secondaryConfirmLabel}
            </Button>
          ) : null}
          <Button onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
