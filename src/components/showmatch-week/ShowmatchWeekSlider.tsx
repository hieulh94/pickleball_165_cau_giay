import { useEffect, useMemo, useState } from 'react'
import { buildShowmatchWeekSlides, type WeeklyShowmatchItem } from '../../lib/showmatch'
import type { PickleballEvent } from '../../types'
import { ShowmatchMatchDetailDialog } from './ShowmatchMatchDetailDialog'
import { ShowmatchWeekDashboard } from './ShowmatchWeekDashboard'
import { ShowmatchWeekTimeline } from './ShowmatchWeekTimeline'

interface ShowmatchWeekSliderProps {
  events: PickleballEvent[]
  onOpenEvent: (event: PickleballEvent) => void
}

export function ShowmatchWeekSlider({ events, onOpenEvent }: ShowmatchWeekSliderProps) {
  const slides = useMemo(() => buildShowmatchWeekSlides(events), [events])
  const initialIndex = useMemo(
    () => Math.max(0, slides.findIndex((slide) => slide.isCurrentWeek)),
    [slides],
  )
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const [nowMs] = useState(() => Date.now())
  const [selectedMatch, setSelectedMatch] = useState<WeeklyShowmatchItem | null>(null)

  useEffect(() => {
    setActiveIndex(initialIndex)
  }, [initialIndex])

  const eventById = useMemo(
    () => new Map(events.map((event) => [event.id, event])),
    [events],
  )

  const handleOpenEventFromDialog = () => {
    if (!selectedMatch) return
    const event = eventById.get(selectedMatch.eventId)
    if (event) onOpenEvent(event)
    setSelectedMatch(null)
  }

  if (slides.length === 0) return null

  const activeSlide = slides[activeIndex] ?? slides[0]

  return (
    <>
      <div className="space-y-6">
        {slides.length > 1 && (
          <ShowmatchWeekTimeline
            slides={slides}
            activeIndex={activeIndex}
            onSelect={setActiveIndex}
          />
        )}

        <ShowmatchWeekDashboard
          key={activeSlide.weekStart.toISOString()}
          slide={activeSlide}
          nowMs={nowMs}
          onOpenEvent={onOpenEvent}
          onSelectMatch={setSelectedMatch}
          eventById={eventById}
        />
      </div>

      <ShowmatchMatchDetailDialog
        open={selectedMatch !== null}
        item={selectedMatch}
        nowMs={nowMs}
        onClose={() => setSelectedMatch(null)}
        onOpenEvent={handleOpenEventFromDialog}
      />
    </>
  )
}
