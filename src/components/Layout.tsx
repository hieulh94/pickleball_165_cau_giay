import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { AppBottomNav, type FooterTab } from './AppBottomNav'
import { ContributionLeaderboardPanel } from './ContributionLeaderboardPanel'

export type LayoutOutletContext = {
  createRequest: number
}

export function Layout() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const [createRequest, setCreateRequest] = useState(0)
  const [footerTab, setFooterTab] = useState<FooterTab>('matches')

  return (
    <div className="flex h-dvh flex-col overflow-hidden pb-16">
      <header className="z-50 shrink-0 border-b border-green-100 bg-gradient-to-r from-green-700 to-emerald-600 text-white shadow-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-3" onClick={() => setFooterTab('matches')}>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-lg font-bold">
              P
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Pickleball 165 Cầu Giấy</h1>
              <p className="text-xs text-green-100">Tổ chức Mini Game</p>
            </div>
          </Link>
          {isHome && footerTab === 'matches' && (
            <button
              type="button"
              onClick={() => setCreateRequest((n) => n + 1)}
              className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-medium text-green-700 shadow-sm hover:bg-green-50"
            >
              + Tạo Event
            </button>
          )}
        </div>
      </header>

      {footerTab === 'matches' ? (
        <main className="mx-auto w-full max-w-5xl min-h-0 flex-1 overflow-y-auto px-4 py-8">
          <Outlet context={{ createRequest } satisfies LayoutOutletContext} />
        </main>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ContributionLeaderboardPanel />
        </div>
      )}

      <AppBottomNav activeTab={footerTab} onTabChange={setFooterTab} />
    </div>
  )
}
