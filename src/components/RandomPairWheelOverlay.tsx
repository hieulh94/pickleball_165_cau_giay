import { useEffect, useMemo, useRef, useState } from 'react'

const SPIN_MS = 5000
const FIREWORKS_MS = 2800
const LABEL_RADIUS_PERCENT = 34

type OverlayPhase = 'spin' | 'fireworks' | 'results'

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

function FireworksLayer() {
  const bursts = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        left: 8 + ((i * 37) % 84),
        top: 12 + ((i * 23) % 58),
        delayMs: (i % 5) * 320,
        color: WHEEL_COLORS[i % WHEEL_COLORS.length],
        particleCount: 10 + (i % 4),
      })),
    [],
  )

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {bursts.map((burst) => (
        <div
          key={burst.id}
          className="absolute"
          style={{ left: `${burst.left}%`, top: `${burst.top}%` }}
        >
          {Array.from({ length: burst.particleCount }, (_, p) => {
            const angle = (360 / burst.particleCount) * p
            return (
              <span
                key={p}
                className="firework-particle-host absolute left-0 top-0 block h-0 w-0"
                style={{ transform: `rotate(${angle}deg)` }}
              >
                <span
                  className="firework-particle block h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: burst.color,
                    animationDelay: `${burst.delayMs + p * 25}ms`,
                  }}
                />
              </span>
            )
          })}
        </div>
      ))}
      <div className="firework-flash absolute inset-0 bg-amber-400/10" />
    </div>
  )
}

interface RandomPairWheelOverlayProps {
  open: boolean
  labels: string[]
  pairLabels: string[]
  onClose: () => void
}

export function RandomPairWheelOverlay({
  open,
  labels,
  pairLabels,
  onClose,
}: RandomPairWheelOverlayProps) {
  const [phase, setPhase] = useState<OverlayPhase>('spin')
  const [rotation, setRotation] = useState(0)
  const onCloseRef = useRef(onClose)
  const labelsRef = useRef(labels)
  onCloseRef.current = onClose
  labelsRef.current = labels

  useEffect(() => {
    if (!open) {
      setPhase('spin')
      setRotation(0)
      return
    }

    setPhase('spin')
    const segmentCount = Math.max(labelsRef.current.length, 6)
    const extraTurns = 7 + Math.floor(Math.random() * 2)
    const finalRotation = extraTurns * 360 + (360 / segmentCount) * (Math.random() * segmentCount)

    setRotation(0)
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setRotation(finalRotation))
    })

    const fireworksTimer = window.setTimeout(() => {
      setPhase('fireworks')
    }, SPIN_MS)

    const resultsTimer = window.setTimeout(() => {
      setPhase('results')
    }, SPIN_MS + FIREWORKS_MS)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(fireworksTimer)
      window.clearTimeout(resultsTimer)
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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={
        phase === 'results' ? 'Kết quả random cặp đôi' : 'Đang random cặp đôi'
      }
    >
      {phase === 'fireworks' && <FireworksLayer />}

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col items-center text-center">
        {phase === 'spin' && (
          <>
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
          </>
        )}

        {phase === 'fireworks' && (
          <div className="py-8">
            <p className="text-3xl font-bold text-amber-300 animate-bounce">🎉 Chúc mừng!</p>
            <p className="mt-3 text-lg text-white/90">Đã ghép cặp thành công</p>
          </div>
        )}

        {phase === 'results' && (
          <div className="flex w-full max-w-md flex-col items-center">
            <p className="text-2xl font-bold text-amber-300">🎉 Các cặp đôi</p>
            <p className="mt-1 text-sm text-slate-300">Ghép cặp hoàn tất</p>

            <ul className="mt-6 max-h-[min(50vh,20rem)] w-full space-y-2 overflow-y-auto pr-1 text-left">
              {pairLabels.map((label, index) => (
                <li
                  key={`${label}-${index}`}
                  className="rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-pink-500/15 px-4 py-3 text-sm font-medium text-white shadow-sm"
                >
                  <span className="mr-2 text-amber-300">#{index + 1}</span>
                  {label}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => onCloseRef.current()}
              className="mt-8 w-full max-w-xs rounded-xl bg-amber-500 px-6 py-3 text-base font-semibold text-slate-900 shadow-lg transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
