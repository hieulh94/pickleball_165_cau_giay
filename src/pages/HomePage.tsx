import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { CreateEventDialog } from '../components/CreateEventDialog'
import { DashboardQuickStats } from '../components/DashboardQuickStats'
import { EventCard } from '../components/EventCard'
import { EventCodeDialog } from '../components/EventCodeDialog'
import { FirebaseSetupNotice } from '../components/FirebaseSetupNotice'
import type { LayoutOutletContext } from '../components/Layout'
import { ShowmatchWeekSlider } from '../components/ShowmatchWeekSlider'
import { FilterChip } from '../components/ui/FilterChip'
import { SearchInput } from '../components/ui/SearchInput'
import { SectionLabel } from '../components/ui/SectionLabel'
import { isFirebaseConfigured } from '../lib/firebase'
import { grantEventAccess } from '../lib/eventAccess'
import { deleteEvent, subscribeEvents, upsertEvent } from '../lib/storage'
import { computeDashboardStats } from '../lib/dashboardStats'
import type { EventType, PickleballEvent } from '../types'

const EVENTS_PAGE_SIZE = 10
type EventListFilter = 'all' | EventType

export function HomePage() {
  const navigate = useNavigate()
  const { createRequest, activeTab } = useOutletContext<LayoutOutletContext>()
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
  const [searchQuery, setSearchQuery] = useState('')
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
    let result = events
    if (listFilter !== 'all') {
      result = result.filter((event) => event.eventType === listFilter)
    }
    const query = searchQuery.trim().toLowerCase()
    if (!query) return result
    return result.filter(
      (event) =>
        event.name.toLowerCase().includes(query) ||
        (event.accessCode ?? '').toLowerCase().includes(query),
    )
  }, [events, listFilter, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / EVENTS_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * EVENTS_PAGE_SIZE
    return filteredEvents.slice(start, start + EVENTS_PAGE_SIZE)
  }, [filteredEvents, currentPage])

  const handleFilterChange = (filter: EventListFilter) => {
    setListFilter(filter)
    setPage(1)
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    setPage(1)
  }

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

  const dashboardStats = useMemo(() => computeDashboardStats(events), [events])

  if (!isFirebaseConfigured()) {
    return (
      <div>
        <FirebaseSetupNotice />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-2">
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Lỗi Firebase: {error}
        </p>
      )}

      {activeTab === 'overview' && (
        <>
          {!loading && (
            <section className="space-y-3">
              <SectionLabel>Showmatch tuần</SectionLabel>
              <ShowmatchWeekSlider events={events} onOpenEvent={handleManage} />
            </section>
          )}

          <section className="space-y-3">
            <SectionLabel>Tổng quan</SectionLabel>
            {!loading && <DashboardQuickStats stats={dashboardStats} />}
            {loading && (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-[108px] animate-pulse rounded-2xl border border-border bg-card"
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === 'matches' && (
      <section className="space-y-3">
        <SectionLabel>Sự kiện</SectionLabel>

        <div className="space-y-3">
          <SearchInput
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Tìm event theo tên hoặc mã..."
          />
          <div className="flex flex-wrap gap-2">
            <FilterChip
              label="Tất cả"
              active={listFilter === 'all'}
              onClick={() => handleFilterChange('all')}
            />
            <FilterChip
              label="Mini game"
              active={listFilter === 'tournament'}
              onClick={() => handleFilterChange('tournament')}
            />
            <FilterChip
              label="Showmatch"
              active={listFilter === 'showmatch'}
              onClick={() => handleFilterChange('showmatch')}
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
        {loading ? (
          <div className="col-span-full rounded-xl border border-neutral-200 bg-white p-12 text-center">
            <p className="text-neutral-500">Đang tải dữ liệu...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-neutral-200 bg-white p-12 text-center">
            <p className="text-neutral-500">Chưa có event nào. Hãy tạo event đầu tiên!</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-neutral-200 bg-white p-12 text-center">
            <p className="text-neutral-500">
              {searchQuery.trim()
                ? 'Không tìm thấy event phù hợp.'
                : `Không có event ${listFilter === 'showmatch' ? 'Showmatch' : 'Mini game'} nào.`}
            </p>
          </div>
        ) : (
          paginatedEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onManage={handleManage}
              onDelete={handleDelete}
            />
          ))
        )}
        </div>

        {!loading && filteredEvents.length > EVENTS_PAGE_SIZE && (
          <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
            <p className="text-sm text-neutral-500">
              Hiển thị {(currentPage - 1) * EVENTS_PAGE_SIZE + 1}–
              {Math.min(currentPage * EVENTS_PAGE_SIZE, filteredEvents.length)} trong{' '}
              {filteredEvents.length} event
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="h-9 rounded-lg border border-neutral-200 px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trước
              </button>
              <span className="text-sm text-neutral-600">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-9 rounded-lg border border-neutral-200 px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </section>
      )}

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
        confirmVariant="danger"
        cancelLabel="Hủy"
        onConfirm={() => {
          void handleConfirmDelete()
        }}
        onCancel={() => setDeleteConfirmEvent(null)}
      />
    </div>
  )
}
