import { useState, type KeyboardEvent } from 'react'
import { PlayerPickerDialog } from './PlayerPickerDialog'

interface PlayerNameInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  excludedNames?: string[]
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
}

export function PlayerNameInput({
  value,
  onChange,
  placeholder = 'Chọn hoặc nhập tên',
  className = '',
  excludedNames,
  onKeyDown,
}: PlayerNameInputProps) {
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={className || 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20'}
        />
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          title="Chọn từ danh sách CLB"
        >
          Chọn
        </button>
      </div>

      <PlayerPickerDialog
        open={pickerOpen}
        excludedNames={excludedNames}
        onClose={() => setPickerOpen(false)}
        onSelect={onChange}
      />
    </>
  )
}
