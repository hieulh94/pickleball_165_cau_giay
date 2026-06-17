import type { ShowmatchWeekSlide } from '../../lib/showmatch'
import { cn } from '../../lib/cn'

interface ShowmatchWeekTimelineProps {
  slides: ShowmatchWeekSlide[]
  activeIndex: number
  onSelect: (index: number) => void
}

export function ShowmatchWeekTimeline({
  slides,
  activeIndex,
  onSelect,
}: ShowmatchWeekTimelineProps) {
  if (slides.length === 0) return null

  return (
    <div className="px-1" aria-label="Dòng thời gian tuần">
      <div className="relative flex items-start justify-between gap-2 sm:justify-center sm:gap-0">
        <div
          className="absolute left-4 right-4 top-[11px] hidden h-px bg-neutral-200 sm:block"
          aria-hidden
        />

        {slides.map((slide, index) => {
          const isActive = index === activeIndex
          const isLast = index === slides.length - 1

          return (
            <div
              key={slide.weekStart.toISOString()}
              className={cn(
                'relative z-10 flex flex-1 flex-col items-center',
                !isLast && 'sm:flex-1',
              )}
            >
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelect(index)}
                className="group flex flex-col items-center gap-2 px-2 py-1 transition duration-200"
              >
                <span
                  className={cn(
                    'rounded-full transition-all duration-300',
                    isActive
                      ? 'h-[22px] w-[22px] bg-primary-600 shadow-[0_0_0_4px_rgba(124,58,237,0.15)]'
                      : 'h-3 w-3 bg-neutral-300 group-hover:bg-primary-300',
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    'whitespace-nowrap text-sm transition duration-200',
                    isActive
                      ? 'font-semibold text-text-primary'
                      : 'font-medium text-text-secondary group-hover:text-text-primary',
                  )}
                >
                  Tuần {slide.weekNumber}
                </span>
                {slide.isCurrentWeek && (
                  <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-600">
                    Hiện tại
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
