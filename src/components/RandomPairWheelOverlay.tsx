import { useEffect, useRef, useState } from 'react'

const SPIN_MS = 5000
const LABEL_RADIUS_PERCENT = 34

const WHEEL_COLORS = [
  '#f59e0b',
  '#ec4899',
  '#3b82f6',
  '#10b981',
  '#8b5cf6',
  '#f97316',
  '#14b8a6',
  '#ef4444',
  '#6366f1',
  '#84cc16',
]

function formatWheelLabel(name: string, segmentCount: number): string {
  const trimmed = name.trim()
  const maxLen = segmentCount > 8 ? 8 : segmentCount > 6 ? 10 : 12
  if (trimmed.length <= maxLen) return trimmed

  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const givenName = parts[parts.length - 1]
    if (givenName.length <= maxLen) return givenName
  }

  return `${trimmed.slice(0, maxLen - 1)}…`
}

function buildConicGradient(segmentCount: number): string {
  const dividerDeg = Math.min(1.2, 360 / segmentCount / 8)
  return Array.from({ length: segmentCount }, (_, i) => {
    const color = WHEEL_COLORS[i % WHEEL_COLORS.length]
    const start = (i / segmentCount) * 360
    const end = ((i + 1) / segmentCount) * 360
    const colorEnd = end - dividerDeg
    return `${color} ${start}deg ${colorEnd}deg, rgba(255,255,255,0.85) ${colorEnd}deg ${end}deg`
  }).join(', ')
}

interface RandomPairWheelOverlayProps {
  open: boolean
  labels: string[]
  onComplete: () => void
}

export function RandomPairWheelOverlay({
  open,
  labels,
  onComplete,
}: RandomPairWheelOverlayProps) {
  const [rotation, setRotation] = useState(0)
  const onCompleteRef = useRef(onComplete)
  const labelsRef = useRef(labels)
  onCompleteRef.current = onComplete
  labelsRef.current = labels

  useEffect(() => {
    if (!open) {
      setRotation(0)
      return
    }

    const segmentCount = Math.max(labelsRef.current.length, 6)
    const extraTurns = 7 + Math.floor(Math.random() * 2)
    const finalRotation = extraTurns * 360 + (360 / segmentCount) * (Math.random() * segmentCount)

    setRotation(0)
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setRotation(finalRotation))
    })

    const timer = window.setTimeout(() => {
      onCompleteRef.current()
    }, SPIN_MS)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(timer)
    }
  }, [open])

  if (!open) return null

  const segmentLabels =
    labels.length >= 2
      ? labels
      : ['🎲', '🏓', '✨', '🎯', '💫', '🔥', '⭐', '🏆']
  const segmentCount = segmentLabels.length
  const segmentAngle = 360 / segmentCount
  const conicGradient = buildConicGradient(segmentCount)
  const labelTextClass =
    segmentCount > 10
      ? 'text-[10px] px-1.5 py-0.5'
      : segmentCount > 7
        ? 'text-[11px] px-2 py-0.5'
        : 'text-xs px-2.5 py-1 sm:text-sm'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Đang random cặp đôi"
    >
      <div className="flex max-w-lg flex-col items-center text-center">
        <p className="text-xl font-bold text-amber-300">Đang random cặp đôi...</p>
        <p className="mt-1 text-sm text-slate-300">Chúc may mắn!</p>

        <div className="relative mt-8">
          <div className="absolute left-1/2 -top-3 z-20 -translate-x-1/2">
            <div
              className="h-0 w-0 border-x-[18px] border-t-[28px] border-x-transparent border-t-red-500 drop-shadow-lg"
              aria-hidden
            />
          </div>

          <div
            className="relative h-[min(88vw,26rem)] w-[min(88vw,26rem)] rounded-full border-[5px] border-amber-400 bg-amber-50 shadow-2xl sm:h-[26rem] sm:w-[26rem]"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.75, 0.1, 1)`,
            }}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{ background: `conic-gradient(from -90deg, ${conicGradient})` }}
            />

            <div className="absolute inset-[12%] rounded-full bg-amber-50/10 ring-2 ring-white/25" />

            {segmentLabels.map((label, i) => {
              const theta = (i + 0.5) * segmentAngle
              const thetaRad = (theta * Math.PI) / 180
              const x = 50 + LABEL_RADIUS_PERCENT * Math.sin(thetaRad)
              const y = 50 - LABEL_RADIUS_PERCENT * Math.cos(thetaRad)
              const displayName = formatWheelLabel(label, segmentCount)

              return (
                <div
                  key={`${label}-${i}`}
                  className="pointer-events-none absolute z-[1]"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: `translate(-50%, -50%) rotate(${theta}deg)`,
                  }}
                >
                  <span
                    title={label}
                    className={`inline-block max-w-[5.5rem] truncate rounded-full border border-white/50 bg-slate-900/75 font-bold leading-none tracking-tight text-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] backdrop-blur-[2px] ${labelTextClass}`}
                  >
                    {displayName}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-amber-500 text-4xl shadow-lg">
            🎲
          </div>
        </div>

        <p className="mt-8 animate-pulse text-sm font-medium text-amber-200">
          Vòng quay đang quay...
        </p>
      </div>
    </div>
  )
}
