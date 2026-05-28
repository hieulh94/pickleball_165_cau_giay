interface EventCodeDialogProps {
  open: boolean
  title: string
  message: string
  value: string
  inputType?: 'text' | 'password'
  placeholder?: string
  error?: string | null
  onChange: (value: string) => void
  onConfirm: () => void
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
  onChange,
  onConfirm,
  onCancel,
}: EventCodeDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
          placeholder={placeholder}
          className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          autoFocus
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Xác thực
          </button>
        </div>
      </div>
    </div>
  )
}
