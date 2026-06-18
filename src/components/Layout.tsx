import { useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AppBottomNav } from './AppBottomNav'
import { AppSidebar, type NavTab } from './AppSidebar'
import { Button } from './ui/Button'
import { computeDashboardStats } from '../lib/dashboardStats'
import { isFirebaseConfigured } from '../lib/firebase'
import { subscribeEvents } from '../lib/storage'
import type { PickleballEvent } from '../types'

export type LayoutOutletContext = {
  createRequest: number
  activeTab: NavTab
}

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'
  const isEventDetail = location.pathname.startsWith('/event/')
  const [createRequest, setCreateRequest] = useState(0)
  const [activeTab, setActiveTab] = useState<NavTab>('overview')
  const [eventList, setEventList] = useState<PickleballEvent[]>([])

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab)
    if (location.pathname !== '/') {
      navigate('/')
    }
  }

  useEffect(() => {
    if (!isFirebaseConfigured()) return
    return subscribeEvents((data) => setEventList(data), () => {})
  }, [])

  const stats = useMemo(() => computeDashboardStats(eventList), [eventList])
  const showHeaderStats =
    isHome && activeTab === 'overview' && !isEventDetail && isFirebaseConfigured()
  const showCreateButton = isHome && activeTab === 'matches' && !isEventDetail

  return (
    <div className="flex h-dvh overflow-hidden bg-surface pb-16 lg:pb-0">
      <AppSidebar activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-50 shrink-0 border-b border-border bg-card">
          <div className="px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <Link
                to="/"
                className="flex min-w-0 items-center gap-2.5 sm:gap-3"
                onClick={() => handleTabChange('overview')}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-sm">
                  P
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-text-primary sm:text-lg">
                    Pickleball 165 Cầu Giấy
                  </p>
                  <p className="text-[11px] text-text-secondary sm:text-xs">CLB nội bộ</p>
                  {showHeaderStats && (
                    <p className="mt-1 text-xs text-text-secondary">
                      <span className="font-medium text-text-primary">{stats.eventCount}</span> Events
                      <span className="mx-1.5 text-neutral-300">•</span>
                      <span className="font-medium text-text-primary">{stats.memberCount}</span>{' '}
                      Members
                      <span className="mx-1.5 text-neutral-300">•</span>
                      <span className="font-medium text-text-primary">{stats.matchCount}</span>{' '}
                      Matches
                    </p>
                  )}
                </div>
              </Link>

              {showCreateButton && (
                <Button size="sm" onClick={() => setCreateRequest((n) => n + 1)} className="shrink-0">
                  + Tạo event
                </Button>
              )}
            </div>
          </div>
        </header>

        <main
          className={`mx-auto w-full max-w-7xl min-h-0 flex-1 px-4 sm:px-6 lg:px-8 ${
            isEventDetail ? 'flex flex-col overflow-hidden' : 'overflow-y-auto py-6 sm:py-8'
          }`}
        >
          <Outlet context={{ createRequest, activeTab } satisfies LayoutOutletContext} />
        </main>
      </div>

      <AppBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  )
}
