import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EventCodeDialog } from '../components/EventCodeDialog'
import { FirebaseSetupNotice } from '../components/FirebaseSetupNotice'
import { isFirebaseConfigured } from '../lib/firebase'
import { deleteEvent, subscribeEvents, upsertEvent } from '../lib/storage'
import type { PickleballEvent } from '../types'

export function HomePage() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<PickleballEvent[]>([])
  const [loading, setLoading] = useState(isFirebaseConfigured())
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [eventName, setEventName] = useState('')
  const [eventPassword, setEventPassword] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [codeDialogOpen, setCodeDialogOpen] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [pendingEvent, setPendingEvent] = useState<PickleballEvent | null>(null)
  const [pendingAction, setPendingAction] = useState<'join' | 'manage' | 'delete' | null>(null)
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState<PickleballEvent | null>(null)

  const normalizeCode = (value: string) => value.trim().toUpperCase().replace(/\s+/g, '')
  const getEventCode = (event: PickleballEvent) => normalizeCode(event.accessCode)
  const getEventPassword = (event: PickleballEvent) => event.accessPassword

  const generateEventCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    do {
      code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join(
        '',
      )
    } while (events.some((event) => getEventCode(event) === code))
    return code
  }

  const closeCodeDialog = () => {
    setCodeDialogOpen(false)
    setCodeInput('')
    setCodeError(null)
    setPendingEvent(null)
    setPendingAction(null)
  }

  const openCodeDialog = (event: PickleballEvent, action: 'join' | 'manage' | 'delete') => {
    const expectedPassword = getEventPassword(event)
    if (!expectedPassword) return
    setPendingEvent(event)
    setPendingAction(action)
    setCodeInput('')
    setCodeError(null)
    setCodeDialogOpen(true)
  }

  useEffect(() => {
    if (!isFirebaseConfigured()) return

    const unsubscribe = subscribeEvents(
      (data) => {
        setEvents(data)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [])

  const handleCreate = async () => {
    const name = eventName.trim()
    const password = eventPassword
    if (!name || saving) return
    const code = generateEventCode()

    const newEvent: PickleballEvent = {
      id: crypto.randomUUID(),
      name,
      accessCode: code,
      accessPassword: password,
      createdAt: new Date().toISOString(),
      participants: [],
      pairs: [],
      splitGroups: false,
      courts: [],
      matches: [],
    }

    setSaving(true)
    try {
      await upsertEvent(newEvent)
      setEventName('')
      setEventPassword('')
      setShowForm(false)
    } catch {
      alert('Không thể tạo event. Kiểm tra cấu hình Firebase và quyền Firestore.')
    } finally {
      setSaving(false)
    }
  }

  const handleJoinByCode = () => {
    const code = normalizeCode(joinCode)
    if (!code) return

    const matched = events.find((event) => normalizeCode(event.accessCode) === code)
    if (!matched) {
      alert('Không tìm thấy event với mã này.')
      return
    }

    if (getEventPassword(matched)) {
      openCodeDialog(matched, 'join')
      return
    }

    navigate(`/event/${matched.id}`)
  }

  const handleManage = (event: PickleballEvent) => {
    const expectedPassword = getEventPassword(event)
    if (!expectedPassword) {
      navigate(`/event/${event.id}`)
      return
    }
    openCodeDialog(event, 'manage')
  }

  const handleDelete = async (event: PickleballEvent) => {
    const expectedPassword = getEventPassword(event)
    if (expectedPassword) {
      openCodeDialog(event, 'delete')
      return
    }
    setDeleteConfirmEvent(event)
  }

  const handleCodeConfirm = async () => {
    if (!pendingEvent || !pendingAction) return

    const expectedPassword = getEventPassword(pendingEvent)
    if (codeInput !== expectedPassword) {
      setCodeError('Password không đúng.')
      return
    }

    const action = pendingAction
    const targetEvent = pendingEvent
    closeCodeDialog()

    if (action === 'manage') {
      navigate(`/event/${targetEvent.id}`)
      return
    }

    if (action === 'join') {
      navigate(`/event/${targetEvent.id}`)
      return
    }

    setDeleteConfirmEvent(targetEvent)
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirmEvent) return

    const targetEvent = deleteConfirmEvent
    setDeleteConfirmEvent(null)
    try {
      await deleteEvent(targetEvent.id)
    } catch {
      alert('Không thể xóa event. Kiểm tra kết nối và quyền Firestore.')
    }
  }

  if (!isFirebaseConfigured()) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Danh sách Event</h2>
        <div className="mt-6">
          <FirebaseSetupNotice />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Danh sách Event</h2>
          <p className="mt-1 text-sm text-slate-500">
            Tạo và quản lý các mini game pickleball · Đồng bộ qua Firebase
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-green-700"
        >
          + Tạo Event
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Lỗi Firebase: {error}
        </p>
      )}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-slate-900">Thành viên mới vào xem theo mã</h3>
        <p className="mt-1 text-sm text-slate-500">
          Nhập mã event do ban tổ chức cung cấp để mở trang event.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
            placeholder="Ví dụ: THU7-CAU1"
            className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase tracking-wide focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          />
          <button
            type="button"
            onClick={handleJoinByCode}
            className="rounded-lg border border-green-600 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50"
          >
            Vào xem
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mt-6 rounded-2xl border border-green-200 bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900">Event mới</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Tên event (VD: Mini game thứ 7)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              autoFocus
            />
            <input
              type="password"
              value={eventPassword}
              onChange={(e) => setEventPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Password event (không bắt buộc)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
          </div>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : 'Tạo'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEventName('')
                setEventPassword('')
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-4">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 p-12 text-center">
            <p className="text-slate-500">Đang tải dữ liệu...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
            <p className="text-slate-500">Chưa có event nào. Hãy tạo event đầu tiên!</p>
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-green-300 hover:shadow-md"
            >
              <div>
                <h3 className="font-semibold text-slate-900">{event.name}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Mã: <span className="font-semibold text-slate-700">{event.accessCode || '—'}</span>
                  {' · '}
                  {event.participants.length} người tham gia
                  {event.matches.length > 0 && ` · ${event.matches.length} trận đấu`}
                  {' · '}
                  {new Date(event.createdAt).toLocaleDateString('vi-VN')}
                </p>
              </div>
              <div className="flex gap-2">
                <span
                  className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
                    event.accessPassword ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}
                  title={event.accessPassword ? 'Private event' : 'Public event'}
                  aria-label={event.accessPassword ? 'Private event' : 'Public event'}
                >
                  {event.accessPassword ? 'Private' : 'Public'}
                </span>
                <button
                  type="button"
                  onClick={() => handleManage(event)}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Quản lý
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(event)}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Xóa
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <EventCodeDialog
        open={codeDialogOpen}
        title={
          pendingAction === 'delete'
            ? 'Nhập password để xóa event'
            : pendingAction === 'join'
              ? 'Nhập password để vào xem event'
              : 'Nhập password để vào quản lý'
        }
        message="Password event không hiển thị và chỉ người tạo biết."
        value={codeInput}
        inputType="password"
        placeholder="Nhập password event"
        error={codeError}
        onChange={(value) => {
          setCodeInput(value)
          if (codeError) setCodeError(null)
        }}
        onConfirm={() => {
          void handleCodeConfirm()
        }}
        onCancel={closeCodeDialog}
      />

      <ConfirmDialog
        open={!!deleteConfirmEvent}
        title="Xóa event"
        message={`Bạn có chắc muốn xóa event "${deleteConfirmEvent?.name ?? ''}" không?`}
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        onConfirm={() => {
          void handleConfirmDelete()
        }}
        onCancel={() => setDeleteConfirmEvent(null)}
      />
    </div>
  )
}
