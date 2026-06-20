import { useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AppBottomNav } from './AppBottomNav'
import { AppSidebar, type NavTab } from './AppSidebar'
import { ContributionLeaderboardPanel } from './ContributionLeaderboardPanel'
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

  const isHomeTab =
    activeTab === 'overview' ||
    activeTab === 'matches' ||
    activeTab === 'members' ||
    activeTab === 'settings'
  const isLeaderboardTab = activeTab === 'leaderboard' && !isEventDetail

  return (
    <div className="flex min-h-dvh bg-surface pb-16 landscape-short:pb-11 lg:min-h-screen lg:pb-0">
      <AppSidebar activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="flex min-w-0 flex-1 flex-col">
        {!isEventDetail && (
        <header className="z-50 shrink-0 border-b border-border bg-card landscape-short:py-0">
          <div className="px-4 py-3 landscape-short:py-2 sm:px-6 lg:px-8">
            {isLeaderboardTab ? (
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <Link
                  to="/"
                  className="flex min-w-0 items-center gap-2.5 justify-self-start sm:gap-3"
                  onClick={() => handleTabChange('overview')}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-xs font-bold text-white shadow-sm">
                    P
                  </div>
                  <div className="min-w-0 hidden min-[400px]:block">
                    <p className="truncate text-sm font-semibold text-text-primary">
                      Pickleball 165 Cầu Giấy
                    </p>
                    <p className="text-[11px] text-text-secondary">CLB nội bộ</p>
                  </div>
                </Link>

                <div className="max-w-[min(100%,16rem)] text-center sm:max-w-xs">
                  <h1 className="text-base font-bold leading-tight text-text-primary sm:text-lg">
                    Bảng xếp hạng
                  </h1>
                  <p className="mt-0.5 text-[10px] leading-snug text-text-secondary sm:text-xs">
                    Theo dõi beer, trận đấu và thành tích CLB
                  </p>
                </div>

                <div aria-hidden className="justify-self-end" />
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <Link
                  to="/"
                  className="flex min-w-0 items-center gap-2.5 sm:gap-3"
                  onClick={() => handleTabChange('overview')}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-sm landscape-short:h-8 landscape-short:w-8 landscape-short:text-xs">
                    P
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-text-primary sm:text-lg landscape-short:text-sm">
                      Pickleball 165 Cầu Giấy
                    </p>
                    <p className="text-[11px] text-text-secondary sm:text-xs landscape-short:hidden">CLB nội bộ</p>
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
            )}
          </div>
        </header>
        )}

        {isHomeTab ? (
          <main
            className={`mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 landscape-short:px-3 ${
              isEventDetail ? 'flex flex-col landscape-short:py-1' : 'py-6 sm:py-8 landscape-short:py-3'
            }`}
          >
            <Outlet context={{ createRequest, activeTab } satisfies LayoutOutletContext} />
          </main>
        ) : (
          <ContributionLeaderboardPanel />
        )}
      </div>

      <AppBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  )
}
