import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { CreateEventDialog } from '../components/CreateEventDialog'
import { EventCodeDialog } from '../components/EventCodeDialog'
import { FirebaseSetupNotice } from '../components/FirebaseSetupNotice'
import type { LayoutOutletContext } from '../components/Layout'
import { WeeklyShowmatchHighlight } from '../components/WeeklyShowmatchHighlight'
import { isFirebaseConfigured } from '../lib/firebase'
import { grantEventAccess } from '../lib/eventAccess'
import { deleteEvent, subscribeEvents, upsertEvent } from '../lib/storage'
import type { EventType, PickleballEvent } from '../types'

const EVENTS_PAGE_SIZE = 10
type EventListFilter = 'all' | EventType

export function HomePage() {
  const navigate = useNavigate()
  const { createRequest } = useOutletContext<LayoutOutletContext>()
  const [events, setEvents] = useState<PickleballEvent[]>([])
  const [loading, setLoading] = useState(isFirebaseConfigured())
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [codeDialogOpen, setCodeDialogOpen] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [pendingEvent, setPendingEvent] = useState<PickleballEvent | null>(null)
  const [pendingAction, setPendingAction] = useState<'join' | 'manage' | 'delete' | null>(null)
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState<PickleballEvent | null>(null)
  const [listFilter, setListFilter] = useState<EventListFilter>('all')
  const [page, setPage] = useState(1)

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

  const filteredEvents = useMemo(() => {
    if (listFilter === 'all') return events
    return events.filter((event) => event.eventType === listFilter)
  }, [events, listFilter])

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / EVENTS_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * EVENTS_PAGE_SIZE
    return filteredEvents.slice(start, start + EVENTS_PAGE_SIZE)
  }, [filteredEvents, currentPage])

  useEffect(() => {
    setPage(1)
  }, [listFilter])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  useEffect(() => {
    if (createRequest > 0 && isFirebaseConfigured()) {
      setShowForm(true)
    }
  }, [createRequest])

  const handleCreate = async ({
    name,
    password,
    eventType,
  }: {
    name: string
    password: string
    eventType: EventType
  }) => {
    if (saving) return
    const code = generateEventCode()

    const newEvent: PickleballEvent = {
      id: crypto.randomUUID(),
      name,
      accessCode: code,
      accessPassword: password,
      createdAt: new Date().toISOString(),
      eventType,
      participants: [],
      pairs: [],
      splitGroups: false,
      courts: [],
      matches: [],
    }

    setSaving(true)
    try {
      await upsertEvent(newEvent)
      setShowForm(false)
    } catch {
      alert('Không thể tạo event. Kiểm tra cấu hình Firebase và quyền Firestore.')
    } finally {
      setSaving(false)
    }
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

    if (action === 'manage' || action === 'join') {
      grantEventAccess(targetEvent.id)
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
        <FirebaseSetupNotice />
      </div>
    )
  }

  return (
    <div>
      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Lỗi Firebase: {error}
        </p>
      )}

      {!loading && (
        <WeeklyShowmatchHighlight events={events} onOpenEvent={handleManage} />
      )}

      <div className="mt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Danh sách event</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setListFilter('all')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                listFilter === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setListFilter('tournament')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                listFilter === 'tournament'
                  ? 'bg-green-600 text-white'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Mini game
            </button>
            <button
              type="button"
              onClick={() => setListFilter('showmatch')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                listFilter === 'showmatch'
                  ? 'bg-fuchsia-600 text-white'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Showmatch
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 p-12 text-center">
            <p className="text-slate-500">Đang tải dữ liệu...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
            <p className="text-slate-500">Chưa có event nào. Hãy tạo event đầu tiên!</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
            <p className="text-slate-500">
              Không có event{' '}
              {listFilter === 'showmatch' ? 'Showmatch' : 'Mini game'} nào.
            </p>
          </div>
        ) : (
          paginatedEvents.map((event) => (
            <div
              key={event.id}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-green-300 hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-900">{event.name}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      event.eventType === 'showmatch'
                        ? 'bg-fuchsia-100 text-fuchsia-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {event.eventType === 'showmatch' ? 'Showmatch' : 'Mini game'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500 break-words">
                  Mã: <span className="font-semibold text-slate-700">{event.accessCode || '—'}</span>
                  {' · '}
                  {event.participants.length} người tham gia
                  {event.matches.length > 0 && ` · ${event.matches.length} trận đấu`}
                  {' · '}
                  {new Date(event.createdAt).toLocaleDateString('vi-VN')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
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
                  className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 sm:flex-none"
                >
                  Quản lý
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(event)}
                  className="flex-1 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 sm:flex-none"
                >
                  Xóa
                </button>
              </div>
            </div>
          ))
        )}
        </div>

        {!loading && filteredEvents.length > EVENTS_PAGE_SIZE && (
          <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
            <p className="text-sm text-slate-500">
              Hiển thị {(currentPage - 1) * EVENTS_PAGE_SIZE + 1}–
              {Math.min(currentPage * EVENTS_PAGE_SIZE, filteredEvents.length)} trong{' '}
              {filteredEvents.length} event
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trước
              </button>
              <span className="text-sm text-slate-600">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateEventDialog
        open={showForm}
        saving={saving}
        onClose={() => setShowForm(false)}
        onCreate={(data) => {
          void handleCreate(data)
        }}
      />

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
