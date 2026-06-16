import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  buildShowmatchWeekSlides,
  formatShortScheduledAt,
  type ShowmatchWeekSlide,
  type WeeklyShowmatchItem,
} from '../lib/showmatch'
import { getShowmatchGamesWon } from '../lib/showmatchScoring'
import { cn } from '../lib/cn'
import type { PickleballEvent } from '../types'

interface ShowmatchWeekSliderProps {
  events: PickleballEvent[]
  onOpenEvent: (event: PickleballEvent) => void
}

function stripSkillLevel(label: string): string {
  return label.replace(/\s*\([12]\)/g, '')
}

function formatTeamLabel(pairLabel: string): string {
  return stripSkillLevel(pairLabel)
    .split(' & ')
    .map((name) => name.trim())
    .filter(Boolean)
    .join(' & ')
}

function MatchupNames({ pair1Label, pair2Label }: { pair1Label: string; pair2Label: string }) {
  const team1 = formatTeamLabel(pair1Label) || '—'
  const team2 = formatTeamLabel(pair2Label) || '—'
  const full = `${team1} vs ${team2}`

  return (
    <div className="mt-1 space-y-0.5" title={full}>
      <p className="line-clamp-2 text-xs font-medium leading-snug text-text-primary">{team1}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-600">vs</p>
      <p className="line-clamp-2 text-xs font-medium leading-snug text-text-primary">{team2}</p>
    </div>
  )
}

function getWeekMatches(items: WeeklyShowmatchItem[], nowMs: number) {
  const upcoming = items
    .filter(
      (item) =>
        !item.match.completed &&
        item.match.scheduledAt &&
        new Date(item.match.scheduledAt).getTime() >= nowMs,
    )
    .sort(
      (a, b) =>
        new Date(a.match.scheduledAt!).getTime() - new Date(b.match.scheduledAt!).getTime(),
    )

  const played = items
    .filter((item) => {
      if (!item.match.scheduledAt) return false
      if (item.match.completed) return true
      return new Date(item.match.scheduledAt).getTime() < nowMs
    })
    .sort(
      (a, b) =>
        new Date(a.match.scheduledAt!).getTime() - new Date(b.match.scheduledAt!).getTime(),
    )

  return { upcoming, played }
}

function CompletedMatchRow({ item, showLabel }: { item: WeeklyShowmatchItem; showLabel: boolean }) {
  const gamesWon = getShowmatchGamesWon(item.match)
  const scheduled = item.match.scheduledAt ? formatShortScheduledAt(item.match.scheduledAt) : '—'

  return (
    <div className={cn(!showLabel && 'border-t border-border/60 pt-2')}>
      {showLabel && (
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
          Đã đấu
        </p>
      )}
      {item.match.name && (
        <p className={cn('text-xs font-medium text-primary-700', showLabel ? 'mt-0.5' : '')}>
          {item.match.name}
        </p>
      )}
      <p className={cn('text-xs font-medium text-text-primary', !item.match.name && showLabel && 'mt-0.5')}>
        {scheduled}
      </p>
      {gamesWon ? (
        <p className="mt-0.5 text-xs font-semibold tabular-nums text-text-primary">
          {gamesWon.score1} – {gamesWon.score2}
        </p>
      ) : (
        <p className="mt-0.5 text-xs text-text-secondary">Chưa có kết quả</p>
      )}
      <MatchupNames pair1Label={item.pair1Label} pair2Label={item.pair2Label} />
    </div>
  )
}

function UpcomingMatchRow({ item, showLabel }: { item: WeeklyShowmatchItem; showLabel: boolean }) {
  const scheduled = item.match.scheduledAt ? formatShortScheduledAt(item.match.scheduledAt) : '—'

  return (
    <div className={cn(!showLabel && 'border-t border-border/60 pt-2')}>
      {showLabel && (
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
          Sắp đấu
        </p>
      )}
      {item.match.name && (
        <p className={cn('text-xs font-medium text-primary-700', showLabel ? 'mt-0.5' : '')}>
          {item.match.name}
        </p>
      )}
      <p className={cn('text-xs font-medium text-text-primary', !item.match.name && showLabel && 'mt-0.5')}>
        {scheduled}
      </p>
      <MatchupNames pair1Label={item.pair1Label} pair2Label={item.pair2Label} />
    </div>
  )
}

function ShowmatchWeekCard({
  slide,
  eventById,
  onOpenEvent,
  nowMs,
}: {
  slide: ShowmatchWeekSlide
  eventById: Map<string, PickleballEvent>
  onOpenEvent: (event: PickleballEvent) => void
  nowMs: number
}) {
  const { upcoming, played } = getWeekMatches(slide.items, nowMs)
  const hasContent = upcoming.length > 0 || played.length > 0
  const primaryEventId = slide.items[0]?.eventId

  const handleOpen = () => {
    const event = primaryEventId ? eventById.get(primaryEventId) : undefined
    if (event) onOpenEvent(event)
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleOpen()
        }
      }}
      className={cn(
        'flex w-[min(100%,300px)] shrink-0 cursor-pointer snap-center flex-col rounded-2xl border p-3 transition duration-200 sm:w-[300px]',
        slide.isCurrentWeek
          ? 'scale-[1.02] border-2 border-primary-600 bg-primary-50 shadow-[0_8px_24px_rgba(124,58,237,0.12)]'
          : 'border-border bg-card shadow-sm hover:border-neutral-300 hover:shadow-md',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-base font-semibold text-text-primary">Tuần {slide.weekNumber}</p>
          <p className="truncate text-[11px] text-text-secondary">{slide.weekLabel}</p>
        </div>
        {slide.isCurrentWeek ? (
          <span className="shrink-0 rounded-md bg-primary-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-white shadow-sm">
            Tuần hiện tại
          </span>
        ) : slide.isNextWeek ? (
          <span className="shrink-0 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
            Tuần sau
          </span>
        ) : null}
      </div>

      {hasContent ? (
        <div className="mt-3 space-y-2 border-t border-border/80 pt-3">
          {upcoming.length > 0 && (
            <div className="space-y-2">
              {upcoming.map((item, index) => (
                <UpcomingMatchRow key={item.match.id} item={item} showLabel={index === 0} />
              ))}
            </div>
          )}
          {played.length > 0 && (
            <div className={cn('space-y-2', upcoming.length > 0 && 'border-t border-border/60 pt-2')}>
              {played.map((item, index) => (
                <CompletedMatchRow key={item.match.id} item={item} showLabel={index === 0} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 border-t border-border/80 pt-3 text-xs text-text-secondary">
          Chưa có trận
        </p>
      )}
    </article>
  )
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
      {direction === 'left' ? (
        <path
          fillRule="evenodd"
          d="M12.79 5.23a.75.75 0 0 1-.02 1.06L8.832 10l3.938 3.71a.75.75 0 1 1-1.04 1.08l-4.5-4.25a.75.75 0 0 1 0-1.08l4.5-4.25a.75.75 0 0 1 1.06.02Z"
          clipRule="evenodd"
        />
      ) : (
        <path
          fillRule="evenodd"
          d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
          clipRule="evenodd"
        />
      )}
    </svg>
  )
}

export function ShowmatchWeekSlider({ events, onOpenEvent }: ShowmatchWeekSliderProps) {
  const slides = useMemo(() => buildShowmatchWeekSlides(events), [events])
  const initialIndex = useMemo(
    () => Math.max(0, slides.findIndex((slide) => slide.isCurrentWeek)),
    [slides],
  )
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const [nowMs] = useState(() => Date.now())
  const trackRef = useRef<HTMLDivElement>(null)

  const eventById = useMemo(
    () => new Map(events.map((event) => [event.id, event])),
    [events],
  )

  const scrollToIndex = useCallback((index: number) => {
    const track = trackRef.current
    if (!track) return
    const card = track.children[index] as HTMLElement | undefined
    if (!card) return
    track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: 'smooth' })
    setActiveIndex(index)
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const card = track.children[initialIndex] as HTMLElement | undefined
    if (!card) return
    track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: 'auto' })
    setActiveIndex(initialIndex)
  }, [initialIndex])

  const handleScroll = useCallback(() => {
    const track = trackRef.current
    if (!track || track.children.length === 0) return
    const scrollLeft = track.scrollLeft
    let closest = 0
    let minDist = Infinity
    for (let i = 0; i < track.children.length; i += 1) {
      const child = track.children[i] as HTMLElement
      const dist = Math.abs(child.offsetLeft - track.offsetLeft - scrollLeft)
      if (dist < minDist) {
        minDist = dist
        closest = i
      }
    }
    setActiveIndex(closest)
  }, [])

  if (slides.length === 0) return null

  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
      <div className="relative">
        <button
          type="button"
          onClick={() => scrollToIndex(Math.max(0, activeIndex - 1))}
          disabled={activeIndex === 0}
          className="absolute -left-1 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-text-secondary shadow-sm transition duration-200 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 hover:shadow-md disabled:opacity-30 sm:flex"
          aria-label="Tuần trước"
        >
          <ChevronIcon direction="left" />
        </button>

        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth py-0.5 sm:px-7"
        >
          {slides.map((slide) => (
            <ShowmatchWeekCard
              key={slide.weekStart.toISOString()}
              slide={slide}
              eventById={eventById}
              onOpenEvent={onOpenEvent}
              nowMs={nowMs}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollToIndex(Math.min(slides.length - 1, activeIndex + 1))}
          disabled={activeIndex === slides.length - 1}
          className="absolute -right-1 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-text-secondary shadow-sm transition duration-200 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 hover:shadow-md disabled:opacity-30 sm:flex"
          aria-label="Tuần sau"
        >
          <ChevronIcon direction="right" />
        </button>
      </div>

      {slides.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {slides.map((slide, index) => (
            <button
              key={slide.weekStart.toISOString()}
              type="button"
              onClick={() => scrollToIndex(index)}
              className={cn(
                'rounded-full transition-all duration-200',
                index === activeIndex
                  ? 'h-1.5 w-5 bg-primary-600'
                  : 'h-1.5 w-1.5 bg-neutral-200 hover:bg-neutral-300',
              )}
              aria-label={`Tuần ${slide.weekNumber}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
