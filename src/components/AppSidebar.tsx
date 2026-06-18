import { cn } from '../lib/cn'

export type NavTab = 'overview' | 'matches' | 'leaderboard' | 'members' | 'settings'

interface AppSidebarProps {
  activeTab: NavTab
  onTabChange: (tab: NavTab) => void
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]" aria-hidden>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]" aria-hidden>
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M5 5H3v1a3 3 0 0 0 3 3M19 5h2v1a3 3 0 0 1-3 3" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]" aria-hidden>
      <path d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  )
}

const NAV_ITEMS: {
  id: NavTab
  label: string
  Icon: typeof HomeIcon
}[] = [
  { id: 'overview', label: 'Tổng quan', Icon: HomeIcon },
  { id: 'matches', label: 'Event', Icon: CalendarIcon },
  { id: 'leaderboard', label: 'BXH', Icon: TrophyIcon },
  { id: 'members', label: 'Thành viên', Icon: UsersIcon },
  { id: 'settings', label: 'Cài đặt', Icon: SettingsIcon },
]

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  return (
    <aside className="hidden w-[180px] shrink-0 flex-col border-r border-border bg-card lg:flex">
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const active = id === activeTab
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={cn(
                'relative flex items-center gap-2.5 rounded-lg py-2 pl-2.5 pr-2 text-[13px] font-medium transition duration-200',
                active
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-text-secondary hover:bg-neutral-50 hover:text-text-primary',
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary-600" />
              )}
              <Icon />
              {label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
