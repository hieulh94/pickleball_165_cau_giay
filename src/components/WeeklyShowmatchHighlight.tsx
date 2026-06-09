import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  buildShowmatchWeekSlides,
  formatScheduledAt,
  type ShowmatchWeekSlide,
  type WeeklyShowmatchItem,
} from '../lib/showmatch'
import { formatShowmatchResult, getShowmatchGamesWon } from '../lib/showmatchScoring'
import type { PickleballEvent } from '../types'

interface WeeklyShowmatchHighlightProps {
  events: PickleballEvent[]
  onOpenEvent: (event: PickleballEvent) => void
}

function stripSkillLevel(label: string): string {
  return label.replace(/\s*\([12]\)/g, '')
}

function pairNames(label: string): string[] {
  return stripSkillLevel(label).split(' & ').filter(Boolean)
}

function FighterIcon({ className }: { className?: string }) {
  return (
    <img
      src="/fighter-icon.png"
      alt=""
      className={`shrink-0 object-cover object-top ${className ?? ''}`}
      aria-hidden
    />
  )
}

function MatchupSides({
  pair1Label,
  pair2Label,
  className = '',
}: {
  pair1Label: string
  pair2Label: string
  className?: string
}) {
  const team1 = pairNames(pair1Label)
  const team2 = pairNames(pair2Label)

  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 ${className}`}>
      <div className="min-w-0 flex-1 text-right">
        {team1.map((name) => (
          <p key={name} className="line-clamp-2 text-[10px] font-medium leading-snug text-slate-700 sm:text-[11px]">
            {name}
          </p>
        ))}
      </div>
      <FighterIcon className="h-7 w-7 sm:h-8 sm:w-8" />
      <div className="min-w-0 flex-1 text-left">
        {team2.map((name) => (
          <p key={name} className="line-clamp-2 text-[10px] font-medium leading-snug text-slate-700 sm:text-[11px]">
            {name}
          </p>
        ))}
      </div>
    </div>
  )
}

function useCompactCarousel() {
  const [compact, setCompact] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  )

  useEffect(() => {
    const media = window.matchMedia('(max-width: 639px)')
    const update = () => setCompact(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return compact
}

function ShowmatchCard({
  item,
  onOpen,
}: {
  item: WeeklyShowmatchItem
  onOpen: () => void
}) {
  const { match, eventName, pair1Label, pair2Label } = item
  const isUpcoming = match.scheduledAt
    ? new Date(match.scheduledAt).getTime() >= Date.now() && !match.completed
    : false
  const gamesWon = getShowmatchGamesWon(match)
  const resultLabel = formatShowmatchResult(match)

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full flex-col rounded-lg border p-2.5 text-left transition hover:shadow-md sm:rounded-xl sm:p-3 ${
        match.completed
          ? 'border-fuchsia-200 bg-fuchsia-50/60'
          : isUpcoming
            ? 'border-fuchsia-400 bg-white ring-1 ring-fuchsia-200'
            : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
        <span className="rounded-md bg-violet-600 px-1.5 py-0.5 text-[9px] font-bold text-white sm:px-2 sm:text-[10px]">
          Bo3
        </span>
        {match.name && (
          <span className="rounded-md bg-fuchsia-700 px-1.5 py-0.5 text-[9px] font-bold text-white sm:px-2 sm:text-[10px]">
            {match.name}
          </span>
        )}
        {match.scheduledAt && (
          <span className="max-w-full rounded-md bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold leading-tight text-white sm:px-2 sm:text-[10px]">
            {formatScheduledAt(match.scheduledAt)}
          </span>
        )}
        {gamesWon ? (
          <span
            className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold sm:px-2 sm:text-[10px] ${
              match.completed
                ? 'bg-fuchsia-600 text-white'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {gamesWon.score1} – {gamesWon.score2}
            {!match.completed ? ' · đang đấu' : ''}
          </span>
        ) : isUpcoming ? (
          <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800 sm:px-2 sm:text-[10px]">
            Sắp đấu
          </span>
        ) : null}
      </div>

      <p className="mt-1.5 line-clamp-1 text-[11px] font-semibold text-fuchsia-900 sm:mt-2 sm:text-xs">
        {eventName}
      </p>
      <MatchupSides pair1Label={pair1Label} pair2Label={pair2Label} className="mt-1 sm:mt-1.5" />
      {resultLabel && (
        <p className="mt-1 line-clamp-2 text-[10px] text-slate-500 sm:text-[11px]">{resultLabel}</p>
      )}
    </button>
  )
}

function WeekSlideContent({
  slide,
  eventById,
  onOpenEvent,
}: {
  slide: ShowmatchWeekSlide
  eventById: Map<string, PickleballEvent>
  onOpenEvent: (event: PickleballEvent) => void
}) {
  const upcoming = slide.items.filter(
    (item) =>
      item.match.scheduledAt &&
      new Date(item.match.scheduledAt).getTime() >= Date.now() &&
      !item.match.completed,
  )
  const rest = slide.items.filter((item) => !upcoming.includes(item))

  if (slide.items.length === 0) {
    return (
      <p className="flex h-full items-center justify-center px-3 text-center text-xs text-slate-500 sm:px-4 sm:text-sm">
        Không có trận showmatch trong tuần này.
      </p>
    )
  }

  const renderList = (items: WeeklyShowmatchItem[]) => (
    <div className="space-y-2">
      {items.map((item) => {
        const event = eventById.get(item.eventId)
        if (!event) return null
        return (
          <ShowmatchCard
            key={item.match.id}
            item={item}
            onOpen={() => onOpenEvent(event)}
          />
        )
      })}
    </div>
  )

  return (
    <div
      className="h-full space-y-3 overflow-y-auto overscroll-contain pr-0.5 sm:space-y-4 sm:pr-1"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      {upcoming.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-fuchsia-800 sm:mb-2 sm:text-xs">
            Sắp tới
          </h4>
          {renderList(upcoming)}
        </div>
      )}
      {rest.length > 0 && (
        <div>
          {upcoming.length > 0 && (
            <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:mb-2 sm:text-xs">
              Đã đấu / đã qua giờ
            </h4>
          )}
          {renderList(rest)}
        </div>
      )}
    </div>
  )
}

function getCoverflowStyle(offset: number, compact: boolean) {
  const abs = Math.abs(offset)
  const maxOffset = compact ? 1 : 2

  if (abs > maxOffset) {
    return {
      transform: 'translateX(-50%) translateY(-50%) rotateY(0deg) scale(0.5)',
      opacity: 0,
      zIndex: 0,
      pointerEvents: 'none' as const,
    }
  }

  const x = offset * (compact ? 92 : 200)
  const rotateY = offset * (compact ? -28 : -45)
  const scale =
    offset === 0 ? 1 : compact ? 0.9 - (abs - 1) * 0.05 : 0.82 - (abs - 1) * 0.08
  const opacity = offset === 0 ? 1 : compact ? 0.7 : abs === 1 ? 0.85 : 0.55
  const zIndex = 10 - abs

  return {
    transform: `translateX(calc(-50% + ${x}px)) translateY(-50%) rotateY(${rotateY}deg) scale(${scale})`,
    opacity,
    zIndex,
    pointerEvents: (abs <= (compact ? 0 : 1) ? 'auto' : compact ? 'none' : 'auto') as
      | 'auto'
      | 'none',
  }
}

function WeekCoverflowPanel({
  slide,
  offset,
  isActive,
  compact,
  eventById,
  onOpenEvent,
  onSelect,
}: {
  slide: ShowmatchWeekSlide
  offset: number
  isActive: boolean
  compact: boolean
  eventById: Map<string, PickleballEvent>
  onOpenEvent: (event: PickleballEvent) => void
  onSelect: () => void
}) {
  const style = getCoverflowStyle(offset, compact)

  return (
    <div
      className="coverflow-slide absolute left-1/2 top-1/2 h-[19.5rem] w-[min(calc(100vw-4.75rem),17.5rem)] cursor-pointer sm:h-[23rem] sm:w-[min(82vw,20rem)]"
      style={{
        ...style,
        transformOrigin: 'center center',
        transition: 'transform 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.45s ease',
      }}
      onClick={() => {
        if (!isActive && !compact) onSelect()
      }}
      role="group"
      aria-hidden={!isActive}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-sm bg-white p-1.5 shadow-2xl ring-1 ring-white/20 sm:p-2">
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-sm bg-gradient-to-b from-fuchsia-50 to-white">
          <div className="shrink-0 border-b border-fuchsia-100 bg-white/90 px-3 py-2.5 text-center sm:px-4 sm:py-3">
            <p className="text-sm font-bold text-fuchsia-950 sm:text-base">
              Tuần {slide.weekNumber}
            </p>
            <p className="mt-0.5 text-[11px] text-fuchsia-700 sm:text-xs">{slide.weekLabel}</p>
            <div className="mt-1.5 flex flex-wrap justify-center gap-1 sm:mt-2 sm:gap-1.5">
              {slide.isCurrentWeek && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800 sm:text-[10px]">
                  Tuần này
                </span>
              )}
              {slide.isNextWeek && !slide.isCurrentWeek && (
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[9px] font-bold text-sky-800 sm:text-[10px]">
                  Tuần sau
                </span>
              )}
              <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-[9px] font-bold text-fuchsia-800 sm:text-[10px]">
                {slide.items.length} trận
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden px-2 py-2 sm:px-3 sm:py-3">
            {isActive ? (
              <WeekSlideContent
                slide={slide}
                eventById={eventById}
                onOpenEvent={onOpenEvent}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-1 text-center sm:px-2">
                {slide.items.length === 0 ? (
                  <p className="text-xs text-slate-500 sm:text-sm">Chưa có trận</p>
                ) : (
                  <>
                    <p className="text-xs font-medium text-slate-700 sm:text-sm">
                      {slide.items.length} trận showmatch
                    </p>
                    {slide.items[0] && (
                      <MatchupSides
                        pair1Label={slide.items[0].pair1Label}
                        pair2Label={slide.items[0].pair2Label}
                        className="mt-1.5 sm:mt-2"
                      />
                    )}
                    {slide.items.length > 1 && (
                      <p className="mt-1 text-[10px] text-slate-500 sm:text-xs">
                        +{slide.items.length - 1} trận khác
                      </p>
                    )}
                  </>
                )}
                {!compact && (
                  <p className="mt-2 text-[9px] font-medium uppercase tracking-wide text-fuchsia-600 sm:mt-3 sm:text-[10px]">
                    Bấm để xem
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function WeeklyShowmatchHighlight({
  events,
  onOpenEvent,
}: WeeklyShowmatchHighlightProps) {
  const compact = useCompactCarousel()
  const slides = useMemo(() => buildShowmatchWeekSlides(events), [events])
  const initialIndex = useMemo(
    () => Math.max(0, slides.findIndex((slide) => slide.isCurrentWeek)),
    [slides],
  )
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const eventById = useMemo(
    () => new Map(events.map((event) => [event.id, event])),
    [events],
  )

  useEffect(() => {
    setActiveIndex(initialIndex)
  }, [initialIndex])

  const goTo = useCallback(
    (index: number) => {
      setActiveIndex(Math.min(Math.max(index, 0), slides.length - 1))
    },
    [slides.length],
  )

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    const threshold = compact ? 30 : 40
    if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy)) return
    if (dx > 0) goTo(activeIndex - 1)
    else goTo(activeIndex + 1)
  }

  if (slides.length === 0) return null

  return (
    <section className="mt-4 overflow-hidden rounded-xl border-2 border-fuchsia-300 bg-gradient-to-br from-fuchsia-950 via-fuchsia-900 to-slate-900 p-3 shadow-lg sm:mt-6 sm:rounded-2xl sm:p-6">
      <div className="text-center">
        <h3 className="text-base font-bold text-white sm:text-lg">Lịch Showmatch</h3>
      </div>

      <div
        className="coverflow-stage relative mx-auto mt-4 h-[21rem] max-w-4xl touch-pan-y sm:mt-6 sm:h-[25rem]"
        style={{ perspective: compact ? '900px' : '1100px' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <button
          type="button"
          onClick={() => goTo(activeIndex - 1)}
          disabled={activeIndex === 0}
          className="absolute left-0 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-white text-lg font-bold text-fuchsia-800 shadow-lg transition hover:bg-fuchsia-50 hover:text-fuchsia-900 disabled:cursor-not-allowed disabled:border-white/40 disabled:bg-white/25 disabled:text-white/50 disabled:shadow-none sm:left-2 sm:h-11 sm:w-11 sm:text-2xl"
          aria-label="Tuần trước"
        >
          ‹
        </button>

        <button
          type="button"
          onClick={() => goTo(activeIndex + 1)}
          disabled={activeIndex === slides.length - 1}
          className="absolute right-0 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-white text-lg font-bold text-fuchsia-800 shadow-lg transition hover:bg-fuchsia-50 hover:text-fuchsia-900 disabled:cursor-not-allowed disabled:border-white/40 disabled:bg-white/25 disabled:text-white/50 disabled:shadow-none sm:right-2 sm:h-11 sm:w-11 sm:text-2xl"
          aria-label="Tuần sau"
        >
          ›
        </button>

        <div
          className="relative h-full w-full overflow-hidden sm:overflow-visible"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {slides.map((slide, index) => (
            <WeekCoverflowPanel
              key={slide.weekStart.toISOString()}
              slide={slide}
              offset={index - activeIndex}
              isActive={index === activeIndex}
              compact={compact}
              eventById={eventById}
              onOpenEvent={onOpenEvent}
              onSelect={() => goTo(index)}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 flex justify-center gap-1.5 sm:mt-4">
        {slides.map((slide, index) => (
          <button
            key={slide.weekStart.toISOString()}
            type="button"
            onClick={() => goTo(index)}
            className={`h-1.5 rounded-full transition-all sm:h-2 ${
              index === activeIndex
                ? 'w-5 bg-white sm:w-6'
                : slide.items.length > 0
                  ? 'w-1.5 bg-fuchsia-300 hover:bg-fuchsia-200 sm:w-2'
                  : 'w-1.5 bg-white/30 hover:bg-white/50 sm:w-2'
            }`}
            aria-label={`Tuần ${slide.weekNumber}`}
          />
        ))}
      </div>
    </section>
  )
}
