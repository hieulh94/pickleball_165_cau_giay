import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FirebaseSetupNotice } from '../components/FirebaseSetupNotice'
import { isFirebaseConfigured } from '../lib/firebase'
import { deleteEvent, subscribeEvents, upsertEvent } from '../lib/storage'
import type { PickleballEvent } from '../types'

export function HomePage() {
  const [events, setEvents] = useState<PickleballEvent[]>([])
  const [loading, setLoading] = useState(isFirebaseConfigured())
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [eventName, setEventName] = useState('')
  const [saving, setSaving] = useState(false)

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
    if (!name || saving) return

    const newEvent: PickleballEvent = {
      id: crypto.randomUUID(),
      name,
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
      setShowForm(false)
    } catch {
      alert('Không thể tạo event. Kiểm tra cấu hình Firebase và quyền Firestore.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa event này?')) return

    try {
      await deleteEvent(id)
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

      {showForm && (
        <div className="mt-6 rounded-2xl border border-green-200 bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900">Event mới</h3>
          <div className="mt-4 flex gap-3">
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Tên event (VD: Mini game thứ 7)"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              autoFocus
            />
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
                  {event.participants.length} người tham gia
                  {event.matches.length > 0 && ` · ${event.matches.length} trận đấu`}
                  {' · '}
                  {new Date(event.createdAt).toLocaleDateString('vi-VN')}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/event/${event.id}`}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Quản lý
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(event.id)}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Xóa
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
