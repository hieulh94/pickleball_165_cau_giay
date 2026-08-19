import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../lib/cn'
import { getPairLabel } from '../lib/pairing'
import {
  collectPlayoffSeedAppearances,
  describeFeedSource,
  DIAGRAM_CARD_WIDTH,
  DIAGRAM_CARD_HEIGHT,
  DIAGRAM_COL_GAP,
  DIAGRAM_PAD_X,
  formatGroupSeed,
  buildTrackConnectors,
  layoutTrackPositions,
  layoutPlayoffTracks,
  type PlayoffDiagramTrack,
} from '../lib/playoffDiagram'
import type { GroupStandings } from '../lib/standings'
import type { Match, Pair, Participant } from '../types'

interface PlayoffBracketDiagramDialogProps {
  open: boolean
  matches: Match[]
  pairs: Pair[]
  participants: Participant[]
  pairNumberById: Map<string, number>
  standingsGroups?: GroupStandings[]
  isPreview?: boolean
  onClose: () => void
}

function todayStamp(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isIosDevice(): boolean {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

function prepareExportLayout(root: HTMLElement): () => void {
  const previous = new Map<HTMLElement, string>()
  const remember = (el: HTMLElement) => {
    if (!previous.has(el)) previous.set(el, el.style.cssText)
  }

  const unlock = (el: HTMLElement | null, extra?: Partial<CSSStyleDeclaration>) => {
    if (!el) return
    remember(el)
    el.style.overflow = 'visible'
    el.style.maxHeight = 'none'
    el.style.maxWidth = 'none'
    el.style.minHeight = '0'
    el.style.flex = 'none'
    if (extra) Object.assign(el.style, extra)
  }

  remember(root)
  root.style.alignSelf = 'flex-start'
  root.style.width = 'max-content'
  root.style.minWidth = 'max-content'
  root.style.maxWidth = 'none'
  root.style.maxHeight = 'none'
  root.style.height = 'auto'
  root.style.minHeight = 'auto'
  root.style.overflow = 'visible'
  root.style.flex = 'none'

  unlock(root.querySelector('[data-export-body]'), {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: 'max-content',
    height: 'auto',
    minHeight: 'auto',
  })

  unlock(root.querySelector('[data-export-groups]'), {
    display: 'flex',
    flexDirection: 'column',
    width: '280px',
    minWidth: '280px',
    maxWidth: '280px',
    height: 'auto',
    borderBottom: 'none',
    borderRight: '1px solid rgb(229, 231, 235)',
  })

  const groupsList = root.querySelector<HTMLElement>('[data-export-groups-list]')
  if (groupsList) {
    remember(groupsList)
    groupsList.style.display = 'block'
    groupsList.style.maxHeight = 'none'
    groupsList.style.overflow = 'visible'
    groupsList.style.height = 'auto'
    groupsList.style.minHeight = 'auto'
  }

  unlock(root.querySelector('[data-export-tracks]'), {
    display: 'flex',
    flexDirection: 'column',
    width: 'max-content',
    height: 'auto',
    minHeight: 'auto',
  })

  root.querySelectorAll<HTMLElement>('[data-diagram-zoom-frame]').forEach((frame) => {
    remember(frame)
    frame.style.overflow = 'visible'
    frame.style.flexShrink = '0'
  })

  return () => {
    for (const [el, css] of previous) el.style.cssText = css
  }
}

function measureExportSize(root: HTMLElement): { width: number; height: number } {
  const rootRect = root.getBoundingClientRect()
  let width = Math.max(root.scrollWidth, root.offsetWidth)
  let height = Math.max(root.scrollHeight, root.offsetHeight)

  const include = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect()
    width = Math.max(width, Math.ceil(rect.right - rootRect.left))
    height = Math.max(height, Math.ceil(rect.bottom - rootRect.top))
    width = Math.max(width, el.offsetLeft + el.offsetWidth)
    height = Math.max(height, el.offsetTop + el.offsetHeight)
  }

  include(root)
  root
    .querySelectorAll<HTMLElement>(
      '[data-export-body], [data-export-groups], [data-export-tracks], [data-diagram-zoom-frame]',
    )
    .forEach(include)

  return {
    width: Math.max(1, Math.ceil(width) + 16),
    height: Math.max(1, Math.ceil(height) + 16),
  }
}

async function waitAnimationFrames(count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve())
    })
  }
}

async function captureDiagramPng(node: HTMLElement): Promise<Blob> {
  const restore = prepareExportLayout(node)
  try {
    await waitAnimationFrames(4)
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 80)
    })
    const { domToBlob } = await import('modern-screenshot')
    const { width, height } = measureExportSize(node)
    const ios = isIosDevice()
    const maxCanvas = ios ? 4096 : 8192
    const scale = Math.min(2, maxCanvas / width, maxCanvas / height)
    const blob = await domToBlob(node, {
      scale,
      width,
      height,
      backgroundColor: '#f8fafc',
      font: false,
      maximumCanvasSize: maxCanvas,
      style: {
        width: `${width}px`,
        height: `${height}px`,
        overflow: 'visible',
        maxWidth: 'none',
        maxHeight: 'none',
      },
      filter: (el) => !(el instanceof HTMLElement && el.hasAttribute('data-export-hide')),
    })
    if (!blob || blob.size === 0) {
      throw new Error('empty image')
    }
    return blob
  } finally {
    restore()
  }
}

function triggerAnchorDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}

async function sharePngFile(blob: Blob, fileName: string): Promise<boolean> {
  const file = new File([blob], fileName, { type: 'image/png' })
  if (typeof navigator.share !== 'function') return false
  if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: [file] })) {
    return false
  }
  try {
    await navigator.share({ files: [file], title: 'Sơ đồ playoff' })
    return true
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return true
    return false
  }
}

function pairNames(pair: Pair | undefined, participants: Participant[]): string {
  if (!pair) return ''
  const p1 = participants.find((p) => p.id === pair.player1Id)
  const p2 = participants.find((p) => p.id === pair.player2Id)
  if (!p1 && !p2) return getPairLabel(pair, participants)
  return [p1?.name, p2?.name].filter(Boolean).join(' & ')
}

function GroupStageTeamsPanel({
  standingsGroups,
  pairs,
  participants,
  pairNumberById,
  matches,
}: {
  standingsGroups: GroupStandings[]
  pairs: Pair[]
  participants: Participant[]
  pairNumberById: Map<string, number>
  matches: Match[]
}) {
  const [open, setOpen] = useState(false)
  const appearances = useMemo(() => collectPlayoffSeedAppearances(matches), [matches])
  const groups = standingsGroups.filter((group) => group.group && group.standings.length > 0)

  if (groups.length === 0) return null

  return (
    <aside
      data-export-expand
      data-export-groups
      className="flex w-full min-h-0 shrink-0 flex-col border-b border-neutral-200 bg-white landscape:h-full landscape:max-h-none landscape:w-[15rem] landscape:border-b-0 landscape:border-r lg:h-auto lg:w-[17.5rem] lg:border-b-0 lg:border-r"
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left landscape:pointer-events-none lg:pointer-events-none"
      >
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
            Vòng bảng
          </p>
          <p className="mt-0.5 text-[11px] text-neutral-500">
            {groups.length} bảng · xếp theo hạng
          </p>
        </div>
        <span
          data-export-hide
          className="rounded-md border border-neutral-300 px-2 py-1 text-[11px] font-semibold text-neutral-700 landscape:hidden lg:hidden"
        >
          {open ? 'Ẩn' : 'Hiện'}
        </span>
      </button>
      <div
        data-export-expand
        data-export-groups-list
        className={cn(
          'min-h-0 space-y-3 overflow-auto px-3 py-3',
          open ? 'max-h-[32vh]' : 'hidden',
          'landscape:block landscape:max-h-none landscape:flex-1',
          'lg:block lg:max-h-none lg:flex-1',
        )}
      >
        {groups.map((group) => (
          <section key={group.group}>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-800">
              {group.group}
            </p>
            <ul className="space-y-1">
              {group.standings.map((row) => {
                const pair = pairs.find((item) => item.id === row.pairId)
                const seed = formatGroupSeed(group.group, row.rank)
                const appearance = appearances.get(seed)
                const number = pairNumberById.get(row.pairId) ?? 0
                return (
                  <li
                    key={row.pairId}
                    className={cn(
                      'rounded-lg border px-2 py-1.5',
                      appearance?.bracket === 'championship'
                        ? 'border-emerald-200 bg-emerald-50'
                        : appearance?.bracket === 'placement'
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-neutral-200 bg-neutral-50 opacity-60',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                          {seed}
                          {number > 0 ? ` · Cặp ${number}` : ''}
                          {` · ${row.wins}T-${row.losses}B`}
                        </p>
                        <p className="truncate text-xs font-semibold text-neutral-900">
                          {pairNames(pair, participants) || '—'}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] font-bold tabular-nums text-neutral-500">
                        #{row.rank}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-neutral-500">
                      {appearance
                        ? appearance.bracket === 'placement'
                          ? `Tranh hạng · ${appearance.matchName}`
                          : `Tranh giải · ${appearance.matchName}`
                        : 'Không vào playoff'}
                    </p>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </aside>
  )
}

function SlotRow({
  pair,
  pairNumber,
  source,
  score,
  won,
  lost,
  waitingLabel,
  label,
  port,
  outPort,
}: {
  pair: Pair | undefined
  pairNumber: number
  source?: string
  score?: number
  won: boolean
  lost: boolean
  waitingLabel: string
  label: string
  port: 'in-1' | 'in-2'
  outPort?: 'W' | 'L'
}) {
  const seed =
    source && !source.startsWith('W:') && !source.startsWith('L:') ? source : null

  return (
    <div
      data-port={port}
      data-out={outPort}
      className={cn(
        'relative flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5',
        won
          ? 'border-emerald-200 bg-emerald-100'
          : lost
            ? 'border-neutral-200 bg-neutral-100 opacity-70'
            : 'border-neutral-200 bg-white',
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
          {pair
            ? `Cặp ${pairNumber || '—'}${seed ? ` · ${seed}` : ''}`
            : 'Chờ đội'}
        </p>
        <p className="truncate text-[13px] font-semibold text-neutral-900">
          {pair ? label || waitingLabel : waitingLabel}
        </p>
      </div>
      {score !== undefined && (
        <span
          className={cn(
            'tabular-nums text-base font-bold',
            won ? 'text-emerald-700' : 'text-neutral-500',
          )}
        >
          {score}
        </span>
      )}
    </div>
  )
}

function DiagramMatchCard({
  match,
  pairs,
  participants,
  pairNumberById,
  matchesById,
  stageLabel,
}: {
  match: Match
  pairs: Pair[]
  participants: Participant[]
  pairNumberById: Map<string, number>
  matchesById: Map<string, Match>
  stageLabel?: string
}) {
  const pair1 = match.pair1Id ? pairs.find((p) => p.id === match.pair1Id) : undefined
  const pair2 = match.pair2Id ? pairs.find((p) => p.id === match.pair2Id) : undefined
  const decided =
    match.completed && match.score1 !== undefined && match.score2 !== undefined
  const won1 = Boolean(decided && match.score1! > match.score2!)
  const won2 = Boolean(decided && match.score2! > match.score1!)

  return (
    <article
      data-diagram-match={match.id}
      className={cn(
        'relative w-[252px] min-h-[148px] rounded-2xl border px-2.5 py-2 shadow-sm',
        match.completed
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-neutral-200 bg-white',
      )}
    >
      <span data-port="W" className="pointer-events-none absolute right-0 top-[32%] h-px w-px" />
      <span data-port="L" className="pointer-events-none absolute right-0 top-[72%] h-px w-px" />
      {stageLabel && (
        <p className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-amber-800">
          {stageLabel}
        </p>
      )}
      {!stageLabel && (
        <p className="mb-1.5 truncate text-[10px] font-bold uppercase tracking-wider text-emerald-700">
          {match.name || 'Playoff'}
        </p>
      )}
      <div className="space-y-1.5">
        <SlotRow
          pair={pair1}
          pairNumber={match.pair1Id ? (pairNumberById.get(match.pair1Id) ?? 0) : 0}
          source={match.pair1Source}
          score={match.score1}
          won={won1}
          lost={won2}
          waitingLabel={describeFeedSource(match.pair1Source, matchesById)}
          label={pairNames(pair1, participants)}
          port="in-1"
          outPort={won1 ? 'W' : won2 ? 'L' : undefined}
        />
        <SlotRow
          pair={pair2}
          pairNumber={match.pair2Id ? (pairNumberById.get(match.pair2Id) ?? 0) : 0}
          source={match.pair2Source}
          score={match.score2}
          won={won2}
          lost={won1}
          waitingLabel={describeFeedSource(match.pair2Source, matchesById)}
          label={pairNames(pair2, participants)}
          port="in-2"
          outPort={won2 ? 'W' : won1 ? 'L' : undefined}
        />
      </div>
    </article>
  )
}

function TrackFlow({
  track,
  matchesById,
  pairs,
  participants,
  pairNumberById,
  zoom,
}: {
  track: PlayoffDiagramTrack
  matchesById: Map<string, Match>
  pairs: Pair[]
  participants: Participant[]
  pairNumberById: Map<string, number>
  zoom: number
}) {
  const layout = useMemo(() => layoutTrackPositions(track), [track])
  const connectors = useMemo(
    () => buildTrackConnectors(track, layout.positions),
    [track, layout],
  )

  const groupLabelByMatch = useMemo(() => {
    const map = new Map<string, string>()
    for (const column of track.columns) {
      if (column.groups.length < 2) continue
      for (const group of column.groups) {
        for (const id of group.matchIds) map.set(id, group.label)
      }
    }
    return map
  }, [track])

  const canvasHeight = layout.height + 28

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3 px-1">
        <h4 className="text-sm font-semibold tracking-wide text-emerald-800">{track.title}</h4>
        <p className="text-[11px] text-neutral-500">{track.matchIds.length} trận</p>
      </div>

      <div
        data-diagram-zoom-frame
        className="relative shrink-0"
        style={{ width: layout.width * zoom, height: canvasHeight * zoom }}
      >
        {track.columns.map((column, index) =>
          column.label ? (
            <p
              key={`${track.id}-h-${index}`}
              className="pointer-events-none absolute z-20 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700"
              style={{
                left: (DIAGRAM_PAD_X + index * (DIAGRAM_CARD_WIDTH + DIAGRAM_COL_GAP)) * zoom,
                width: DIAGRAM_CARD_WIDTH * zoom,
                top: 4 * zoom,
              }}
            >
              {column.label}
            </p>
          ) : null,
        )}

        <svg
          className="pointer-events-none absolute left-0 top-0 z-0"
          width={layout.width * zoom}
          height={canvasHeight * zoom}
          viewBox={`0 0 ${layout.width} ${canvasHeight}`}
          preserveAspectRatio="xMinYMin meet"
          aria-hidden
        >
          {connectors.map((connector, index) => (
            <path
              key={`${connector.kind}-${index}`}
              d={connector.path}
              fill="none"
              stroke={connector.kind === 'W' ? '#059669' : '#d97706'}
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeOpacity={connector.kind === 'W' ? 0.95 : 0.9}
            />
          ))}
        </svg>

        {[...layout.positions.values()].map((pos) => {
          const match = matchesById.get(pos.matchId)
          if (!match) return null
          return (
            <div
              key={match.id}
              className="absolute z-10 overflow-hidden"
              style={{
                left: pos.x * zoom,
                top: pos.y * zoom,
                width: DIAGRAM_CARD_WIDTH * zoom,
                height: DIAGRAM_CARD_HEIGHT * zoom,
              }}
            >
              <div
                style={{
                  width: DIAGRAM_CARD_WIDTH,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                }}
              >
                <DiagramMatchCard
                  match={match}
                  pairs={pairs}
                  participants={participants}
                  pairNumberById={pairNumberById}
                  matchesById={matchesById}
                  stageLabel={groupLabelByMatch.get(match.id)}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

const MIN_ZOOM = 0.5
const MAX_ZOOM = 1.5
const ZOOM_STEP = 0.1

function defaultZoom(): number {
  if (typeof window === 'undefined') return 1
  if (window.matchMedia('(orientation: landscape)').matches) return 0.9
  return window.matchMedia('(max-width: 640px)').matches ? 0.72 : 1
}

export function PlayoffBracketDiagramDialog({
  open,
  matches,
  pairs,
  participants,
  pairNumberById,
  standingsGroups = [],
  isPreview = false,
  onClose,
}: PlayoffBracketDiagramDialogProps) {
  const exportRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [imagePreview, setImagePreview] = useState<{
    url: string
    fileName: string
    blob: Blob
  } | null>(null)
  const tracks = useMemo(() => layoutPlayoffTracks(matches), [matches])
  const matchesById = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches])

  useEffect(() => {
    if (!open) return
    setZoom(defaultZoom())
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const syncZoom = () => setZoom(defaultZoom())
    window.addEventListener('orientationchange', syncZoom)
    const landscape = window.matchMedia('(orientation: landscape)')
    landscape.addEventListener('change', syncZoom)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('orientationchange', syncZoom)
      landscape.removeEventListener('change', syncZoom)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview.url)
        setImagePreview(null)
        return
      }
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, imagePreview])

  useEffect(() => {
    if (open) return
    setImagePreview((current) => {
      if (current) URL.revokeObjectURL(current.url)
      return null
    })
  }, [open])

  const closeImagePreview = () => {
    if (!imagePreview) return
    URL.revokeObjectURL(imagePreview.url)
    setImagePreview(null)
  }

  const handleDownloadImage = async () => {
    if (downloading || tracks.length === 0) return
    setDownloading(true)
    setExporting(true)
    try {
      await waitAnimationFrames(3)
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 50)
      })
      const node = exportRef.current
      if (!node) throw new Error('missing diagram')
      const blob = await captureDiagramPng(node)
      const fileName = `so-do-playoff-${todayStamp()}.png`
      if (isIosDevice()) {
        setImagePreview({ url: URL.createObjectURL(blob), fileName, blob })
        return
      }
      triggerAnchorDownload(blob, fileName)
    } catch {
      alert('Không tải được ảnh. Thử lại.')
    } finally {
      setExporting(false)
      setDownloading(false)
    }
  }

  const handleSharePreview = async () => {
    if (!imagePreview) return
    const shared = await sharePngFile(imagePreview.blob, imagePreview.fileName)
    if (!shared) {
      alert('Nhấn giữ ảnh rồi chọn Lưu ảnh.')
    }
  }

  const bumpZoom = (delta: number) => {
    setZoom((value) =>
      Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((value + delta) * 10) / 10)),
    )
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center overscroll-none lg:items-center lg:p-5">
      <div className="absolute inset-0 bg-neutral-900/40 lg:bg-neutral-900/30" onClick={onClose} />
      <div
        ref={exportRef}
        className="relative flex h-dvh w-full max-w-none flex-col overflow-hidden bg-slate-50 lg:h-auto lg:max-h-[min(94dvh,56rem)] lg:max-w-6xl lg:rounded-2xl lg:border lg:border-neutral-200 lg:shadow-2xl"
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-neutral-200 bg-white px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:items-start sm:px-6 sm:py-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-neutral-900 sm:text-lg">
              Sơ đồ playoff
            </h3>
            <p className="mt-0.5 hidden text-xs text-neutral-500 sm:block">
              Thắng đi tiếp (xanh) · thua sang nhánh phụ (vàng) — trận sau nằm giữa hai trận nuôi
            </p>
            {isPreview && (
              <p className="mt-1 text-[11px] text-amber-700 sm:text-xs">
                Sơ đồ dự kiến từ BXH — tạo bracket để lưu trận và nhập kết quả.
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2" data-export-hide>
            <button
              type="button"
              onClick={() => void handleDownloadImage()}
              disabled={downloading || tracks.length === 0}
              className="min-h-10 rounded-lg bg-emerald-600 px-2.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-sm"
            >
              {downloading ? 'Đang tải…' : 'Tải ảnh'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-10 rounded-lg border border-neutral-300 px-2.5 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 sm:px-3 sm:text-sm"
            >
              Đóng
            </button>
          </div>
        </header>

        <div
          className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-200 bg-white px-3 py-1.5 landscape:hidden lg:hidden"
          data-export-hide
        >
          <p className="text-[11px] text-neutral-500">Vuốt để xem nhánh · xoay ngang vừa hơn</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Thu nhỏ"
              onClick={() => bumpZoom(-ZOOM_STEP)}
              disabled={zoom <= MIN_ZOOM}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-300 text-sm font-bold text-neutral-800 disabled:opacity-40"
            >
              −
            </button>
            <span className="w-10 text-center text-[11px] tabular-nums text-neutral-600">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              aria-label="Phóng to"
              onClick={() => bumpZoom(ZOOM_STEP)}
              disabled={zoom >= MAX_ZOOM}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-300 text-sm font-bold text-neutral-800 disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>

        <div
          data-export-expand
          data-export-body
          className="flex min-h-0 flex-1 flex-col landscape:flex-row lg:flex-row"
        >
          <GroupStageTeamsPanel
            standingsGroups={standingsGroups}
            pairs={pairs}
            participants={participants}
            pairNumberById={pairNumberById}
            matches={matches}
          />
          <div
            data-export-expand
            data-export-tracks
            className="min-h-0 min-w-0 flex-1 space-y-8 overflow-auto overscroll-contain px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:space-y-10 sm:px-5 sm:py-4 [-webkit-overflow-scrolling:touch]"
          >
            {tracks.length === 0 ? (
              <p className="py-10 text-center text-sm text-neutral-500">
                Chưa có trận playoff để vẽ sơ đồ.
              </p>
            ) : (
              tracks.map((track) => (
                <TrackFlow
                  key={track.id}
                  track={track}
                  matchesById={matchesById}
                  pairs={pairs}
                  participants={participants}
                  pairNumberById={pairNumberById}
                  zoom={exporting ? 1 : zoom}
                />
              ))
            )}
          </div>
        </div>

        {imagePreview && (
          <div
            className="absolute inset-0 z-20 flex flex-col bg-slate-50 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            data-export-hide
          >
            <div className="flex shrink-0 items-center gap-2 px-3 py-2">
              <p className="min-w-0 flex-1 text-sm font-semibold text-neutral-900">
                Nhấn giữ ảnh để lưu
              </p>
              <button
                type="button"
                onClick={() => void handleSharePreview()}
                className="min-h-10 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
              >
                Lưu / Chia sẻ
              </button>
              <button
                type="button"
                onClick={closeImagePreview}
                className="min-h-10 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700"
              >
                Đóng
              </button>
            </div>
            <p className="shrink-0 px-3 pb-2 text-[11px] text-neutral-500">
              Ảnh xuất ngang cho rõ chữ. Xoay ngang máy để xem, hoặc bấm Lưu / Chia sẻ.
            </p>
            <div className="min-h-0 flex-1 overflow-auto overscroll-contain px-3">
              <img
                src={imagePreview.url}
                alt="Sơ đồ playoff"
                className="mx-auto h-auto w-max max-w-none select-auto rounded-lg landscape:h-full landscape:w-auto landscape:max-h-full"
                style={{ WebkitTouchCallout: 'default', WebkitUserSelect: 'auto' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
