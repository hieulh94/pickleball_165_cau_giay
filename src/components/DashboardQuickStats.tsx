import type { ReactNode } from 'react'
import { formatTrendLabel, type DashboardStats } from '../lib/dashboardStats'
import { cn } from '../lib/cn'

interface StatCardProps {
  label: string
  value: number | string
  trend: string
  icon: ReactNode
  trendPositive?: boolean
}

function StatCard({ label, value, trend, icon, trendPositive = true }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-[0_8px_24px_rgba(124,58,237,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            'bg-primary-50 text-primary-600 ring-1 ring-primary-100',
            'transition duration-200 group-hover:bg-primary-100 group-hover:ring-primary-200',
          )}
        >
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <p className="text-xs font-medium text-text-secondary">{label}</p>
        <p className="mt-1 text-[28px] font-semibold leading-none tabular-nums tracking-tight text-text-primary">
          {value}
        </p>
        <p
          className={cn(
            'mt-2 text-xs font-medium',
            trendPositive ? 'text-secondary-600' : 'text-text-secondary',
          )}
        >
          {trend}
        </p>
      </div>
    </div>
  )
}

function EventsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
      <path d="M5.25 3A2.25 2.25 0 0 0 3 5.25v9.5A2.25 2.25 0 0 0 5.25 17h9.5A2.25 2.25 0 0 0 17 14.75v-9.5A2.25 2.25 0 0 0 14.75 3H5.25ZM4.5 5.25a.75.75 0 0 1 .75-.75h9.5a.75.75 0 0 1 .75.75v9.5a.75.75 0 0 1-.75.75h-9.5a.75.75 0 0 1-.75-.75v-9.5Z" />
    </svg>
  )
}

function MembersIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
      <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM16 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.26 11.24a4 4 0 0 0-2.56 3.74v.5a.75.75 0 0 0 .75.75h7.02a.75.75 0 0 0 .75-.75v-.5a4 4 0 0 0-2.56-3.74A6.72 6.72 0 0 0 10 10.5c-1.8 0-3.46.7-4.74 1.74Z" />
    </svg>
  )
}

function MatchesIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
      <path d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM0 10a10 10 0 1 1 20 0A10 10 0 0 1 0 10Z" />
    </svg>
  )
}

function WeekIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
      <path d="M5.25 3A2.25 2.25 0 0 0 3 5.25v9.5A2.25 2.25 0 0 0 5.25 17h9.5A2.25 2.25 0 0 0 17 14.75v-9.5A2.25 2.25 0 0 0 14.75 3H5.25ZM6 5.25v.75a.75.75 0 0 0 1.5 0v-.75h5v.75a.75.75 0 0 0 1.5 0v-.75h.75a.75.75 0 0 1 .75.75v2.25H5.25V6a.75.75 0 0 1 .75-.75H6Z" />
    </svg>
  )
}

interface DashboardQuickStatsProps {
  stats: DashboardStats
}

export function DashboardQuickStats({ stats }: DashboardQuickStatsProps) {
  const { trends } = stats

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      <StatCard
        label="Events"
        value={stats.eventCount}
        trend={formatTrendLabel('events', trends)}
        icon={<EventsIcon />}
        trendPositive={trends.eventsThisMonth > 0}
      />
      <StatCard
        label="Thành viên"
        value={stats.memberCount}
        trend={formatTrendLabel('members', trends)}
        icon={<MembersIcon />}
        trendPositive={trends.membersThisMonth > 0}
      />
      <StatCard
        label="Trận đấu"
        value={stats.matchCount}
        trend={formatTrendLabel('matches', trends)}
        icon={<MatchesIcon />}
        trendPositive={trends.matchesThisWeek > 0}
      />
      <StatCard
        label="Tuần hiện tại"
        value={stats.currentWeek}
        trend={formatTrendLabel('week', trends)}
        icon={<WeekIcon />}
        trendPositive
      />
    </div>
  )
}
