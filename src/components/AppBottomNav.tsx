import type { NavTab } from './AppSidebar'

interface AppBottomNavProps {
  activeTab: NavTab
  onTabChange: (tab: NavTab) => void
}

function OverviewIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden>
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M5 5H3v1a3 3 0 0 0 3 3M19 5h2v1a3 3 0 0 1-3 3" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden>
      <path d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  )
}

const TABS: { id: NavTab; label: string; Icon: typeof OverviewIcon }[] = [
  { id: 'overview', label: 'Tổng quan', Icon: OverviewIcon },
  { id: 'matches', label: 'Event', Icon: CalendarIcon },
  { id: 'leaderboard', label: 'BXH', Icon: TrophyIcon },
  { id: 'members', label: 'Thành viên', Icon: UsersIcon },
  { id: 'settings', label: 'Cài đặt', Icon: SettingsIcon },
]

export function AppBottomNav({ activeTab, onTabChange }: AppBottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card shadow-[0_-4px_16px_rgba(15,23,42,0.04)] landscape-short:shadow-none lg:hidden">
      <div className="mx-auto grid max-w-7xl grid-cols-5 landscape-short:grid-cols-5">
        {TABS.map(({ id, label, Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-semibold uppercase tracking-wide transition landscape-short:flex-row landscape-short:justify-center landscape-short:gap-1.5 landscape-short:py-1.5 landscape-short:text-[9px] landscape-short:[&_svg]:h-5 landscape-short:[&_svg]:w-5 ${
                active ? 'text-primary-600' : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              <Icon />
              <span className="landscape-short:truncate">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
