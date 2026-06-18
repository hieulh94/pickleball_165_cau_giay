import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import type { LeaderboardMetric, LeaderboardPeriod, LeaderboardSource } from '../../lib/leaderboard'

const PERIOD_OPTIONS: { id: LeaderboardPeriod; label: string }[] = [
  { id: 'today', label: 'Hôm nay' },
  { id: 'week', label: 'Tuần này' },
  { id: 'month', label: 'Tháng này' },
  { id: 'all', label: 'Tất cả' },
]

const SOURCE_OPTIONS: { id: LeaderboardSource; label: string }[] = [
  { id: 'tournament', label: 'Mini game' },
  { id: 'showmatch', label: 'Showmatch' },
]

function metricOptions(source: LeaderboardSource): { id: LeaderboardMetric; label: string }[] {
  return [
    { id: 'earnings', label: '🍺 Beer cống hiến' },
    { id: 'wins', label: '🏆 Thắng' },
    { id: 'matches', label: '🎾 Trận' },
    {
      id: 'contribution',
      label: source === 'showmatch' ? '⭐ Showmatch' : '⭐ Mini game',
    },
  ]
}

type FilterMenuId = 'source' | 'period' | 'metric'

function FilterGroupIcon({ kind }: { kind: FilterMenuId }) {
  const className = 'h-4 w-4 shrink-0'

  if (kind === 'source') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
        <path d="M4 7h16M4 12h10M4 17h6" strokeLinecap="round" />
        <circle cx="18" cy="12" r="2" />
        <circle cx="14" cy="17" r="2" />
        <circle cx="20" cy="7" r="2" />
      </svg>
    )
  }

  if (kind === 'period') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
    </svg>
  )
}

interface LeaderboardFiltersProps {
  period: LeaderboardPeriod
  metric: LeaderboardMetric
  source: LeaderboardSource
  onPeriodChange: (period: LeaderboardPeriod) => void
  onMetricChange: (metric: LeaderboardMetric) => void
  onSourceChange: (source: LeaderboardSource) => void
}

function FilterMenu({
  kind,
  groupLabel,
  valueLabel,
  open,
  onToggle,
  children,
}: {
  kind: FilterMenuId
  groupLabel: string
  valueLabel: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className="relative min-w-0 flex-1 sm:flex-none">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`Lọc ${groupLabel.toLowerCase()}: ${valueLabel}`}
        className={cn(
          'flex w-full items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition sm:w-auto sm:min-w-[8.5rem] sm:px-2.5 sm:py-2',
          open
            ? 'border-primary-300 bg-primary-50 text-primary-800'
            : 'border-border bg-card text-text-primary hover:border-primary-200 hover:bg-primary-50/50',
        )}
      >
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
            open ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-text-secondary',
          )}
        >
          <FilterGroupIcon kind={kind} />
        </span>

        <span className="min-w-0 flex-1 truncate">
          <span className="text-[10px] font-medium uppercase tracking-wide text-text-secondary sm:text-[11px]">
            {groupLabel}
          </span>
          <span className="block truncate text-xs font-semibold sm:text-sm">{valueLabel}</span>
        </span>

        <span
          className={cn(
            'shrink-0 text-[10px] text-text-secondary transition',
            open && 'rotate-180',
          )}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+0.25rem)] z-30 min-w-full overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg sm:min-w-[10rem]"
        >
          {children}
        </div>
      )}
    </div>
  )
}

function FilterMenuOption({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition',
        active
          ? 'bg-primary-50 font-semibold text-primary-700'
          : 'text-text-primary hover:bg-neutral-50',
      )}
    >
      {active && <span className="text-primary-600" aria-hidden>✓</span>}
      <span className={active ? '' : 'pl-5'}>{label}</span>
    </button>
  )
}

export function LeaderboardFilters({
  period,
  metric,
  source,
  onPeriodChange,
  onMetricChange,
  onSourceChange,
}: LeaderboardFiltersProps) {
  const [openMenu, setOpenMenu] = useState<FilterMenuId | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const metrics = metricOptions(source)
  const sourceLabel = SOURCE_OPTIONS.find((o) => o.id === source)?.label ?? ''
  const periodLabel = PERIOD_OPTIONS.find((o) => o.id === period)?.label ?? ''
  const metricLabel = metrics.find((o) => o.id === metric)?.label ?? ''

  useEffect(() => {
    if (!openMenu) return

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpenMenu(null)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [openMenu])

  const toggle = (id: FilterMenuId) => {
    setOpenMenu((prev) => (prev === id ? null : id))
  }

  const closeAnd = (fn: () => void) => {
    fn()
    setOpenMenu(null)
  }

  return (
    <div ref={containerRef} className="flex items-stretch gap-2">
      <FilterMenu
        kind="source"
        groupLabel="Loại"
        valueLabel={sourceLabel}
        open={openMenu === 'source'}
        onToggle={() => toggle('source')}
      >
        {SOURCE_OPTIONS.map((option) => (
          <FilterMenuOption
            key={option.id}
            label={option.label}
            active={source === option.id}
            onClick={() => closeAnd(() => onSourceChange(option.id))}
          />
        ))}
      </FilterMenu>

      <FilterMenu
        kind="period"
        groupLabel="Thời gian"
        valueLabel={periodLabel}
        open={openMenu === 'period'}
        onToggle={() => toggle('period')}
      >
        {PERIOD_OPTIONS.map((option) => (
          <FilterMenuOption
            key={option.id}
            label={option.label}
            active={period === option.id}
            onClick={() => closeAnd(() => onPeriodChange(option.id))}
          />
        ))}
      </FilterMenu>

      <FilterMenu
        kind="metric"
        groupLabel="Xếp theo"
        valueLabel={metricLabel}
        open={openMenu === 'metric'}
        onToggle={() => toggle('metric')}
      >
        {metrics.map((option) => (
          <FilterMenuOption
            key={option.id}
            label={option.label}
            active={metric === option.id}
            onClick={() => closeAnd(() => onMetricChange(option.id))}
          />
        ))}
      </FilterMenu>
    </div>
  )
}
