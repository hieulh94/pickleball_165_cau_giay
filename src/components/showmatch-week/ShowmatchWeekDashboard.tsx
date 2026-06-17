import type { ShowmatchWeekSlide, WeeklyShowmatchItem } from '../../lib/showmatch'
import type { PickleballEvent } from '../../types'
import { cn } from '../../lib/cn'
import { ShowmatchMatchTimeline } from './ShowmatchMatchTimeline'
import { ShowmatchWeekInsight } from './ShowmatchWeekInsight'
import { getWeekStatus, partitionWeekMatches } from './showmatchWeekUtils'

function weekStatusLabel(
  weekStart: Date,
  isCurrentWeek: boolean,
  isNextWeek: boolean,
  nowMs: number,
): string | null {
  const status = getWeekStatus(weekStart, isCurrentWeek, isNextWeek, nowMs)
  if (status === 'current') return 'Tuần hiện tại'
  if (status === 'next') return 'Tuần sau'
  if (status === 'completed') return 'Đã qua'
  return null
}

interface ShowmatchWeekDashboardProps {
  slide: ShowmatchWeekSlide
  nowMs: number
  onOpenEvent: (event: PickleballEvent) => void
  onSelectMatch: (item: WeeklyShowmatchItem) => void
  eventById: Map<string, PickleballEvent>
}

export function ShowmatchWeekDashboard({
  slide,
  nowMs,
  onOpenEvent,
  onSelectMatch,
  eventById,
}: ShowmatchWeekDashboardProps) {
  const statusLabel = weekStatusLabel(
    slide.weekStart,
    slide.isCurrentWeek,
    slide.isNextWeek,
    nowMs,
  )
  const { upcoming, total, upcomingCount, finishedCount } = partitionWeekMatches(
    slide.items,
    nowMs,
  )
  const primaryEventId = slide.items[0]?.eventId

  const openWeek = () => {
    const event = primaryEventId ? eventById.get(primaryEventId) : undefined
    if (event) onOpenEvent(event)
  }

  const summaryParts = [
    `${total} trận`,
    upcomingCount > 0 ? `${upcomingCount} sắp đấu` : null,
    finishedCount > 0 ? `${finishedCount} đã xong` : null,
  ].filter(Boolean)

  return (
    <article className="showmatch-week-enter w-full">
      <div
        className={cn(
          'rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl sm:p-6',
          'bg-white/80 ring-1 ring-neutral-200/70',
          slide.isCurrentWeek
            ? 'bg-gradient-to-br from-primary-50/70 via-white/90 to-white/80 ring-primary-200/80'
            : 'shadow-[0_8px_24px_rgba(0,0,0,0.05)]',
        )}
      >
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            {slide.isCurrentWeek && (
              <p className="text-[11px] font-semibold uppercase tracking-widest text-primary-600">
                Tuần này
              </p>
            )}
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="text-3xl font-semibold leading-none tracking-tight text-text-primary">
                Tuần {slide.weekNumber}
              </h3>
              {statusLabel && !slide.isCurrentWeek && (
                <span className="text-sm font-medium text-text-secondary">{statusLabel}</span>
              )}
            </div>
            <p className="text-sm text-text-secondary">{slide.weekLabel}</p>
            {summaryParts.length > 0 && (
              <p className="text-sm text-text-secondary">{summaryParts.join(' · ')}</p>
            )}
          </div>

          {total > 0 && (
            <div className="w-full sm:max-w-xs sm:shrink-0">
              <ShowmatchWeekInsight
                upcoming={upcoming}
                total={total}
                finishedCount={finishedCount}
                nowMs={nowMs}
              />
            </div>
          )}
        </header>

        {total === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <p className="text-sm text-text-secondary">Chưa có trận tuần này</p>
            <button
              type="button"
              onClick={openWeek}
              className="mt-4 rounded-full px-4 py-2 text-sm font-semibold text-primary-600 transition duration-200 hover:bg-primary-50 active:scale-95"
            >
              Mở event showmatch →
            </button>
          </div>
        ) : (
          <ShowmatchMatchTimeline items={slide.items} nowMs={nowMs} onSelectMatch={onSelectMatch} />
        )}
      </div>
    </article>
  )
}
