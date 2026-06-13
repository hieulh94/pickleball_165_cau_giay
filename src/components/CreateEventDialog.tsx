import { useEffect, useState } from 'react'
import { getDefaultShowmatchName } from '../lib/showmatch'
import type { EventType } from '../types'

interface CreateEventDialogProps {
  open: boolean
  saving: boolean
  onClose: () => void
  onCreate: (data: { name: string; password: string; eventType: EventType }) => void
}

export function CreateEventDialog({ open, saving, onClose, onCreate }: CreateEventDialogProps) {
  const [eventName, setEventName] = useState('')
  const [eventPassword, setEventPassword] = useState('')
  const [eventType, setEventType] = useState<EventType>('tournament')

  useEffect(() => {
    if (open) {
      setEventName('')
      setEventPassword('')
      setEventType('tournament')
    }
  }, [open])

  if (!open) return null

  const handleSubmit = () => {
    const name = eventName.trim()
    if (!name || saving) return
    onCreate({ name, password: eventPassword, eventType })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">Event mới</h3>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setEventType('tournament')
              if (!eventName || eventName === getDefaultShowmatchName()) {
                setEventName('')
              }
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              eventType === 'tournament'
                ? 'bg-green-600 text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Mini game
          </button>
          <button
            type="button"
            onClick={() => {
              setEventType('showmatch')
              if (!eventName.trim()) {
                setEventName(getDefaultShowmatchName())
              }
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              eventType === 'showmatch'
                ? 'bg-fuchsia-600 text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Showmatch tuần
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <input
            type="text"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={
              eventType === 'showmatch'
                ? getDefaultShowmatchName()
                : 'Tên event (VD: Mini game thứ 7)'
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            autoFocus
          />
          <input
            type="password"
            value={eventPassword}
            onChange={(e) => setEventPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Password event (không bắt buộc)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !eventName.trim()}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : 'Tạo'}
          </button>
        </div>
      </div>
    </div>
  )
}
