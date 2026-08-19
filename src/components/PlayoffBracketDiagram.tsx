import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../lib/cn'
import { getPairLabel } from '../lib/pairing'
import {
  collectPlayoffSeedAppearances,
  describeFeedSource,
  DIAGRAM_CARD_WIDTH,
  DIAGRAM_COL_GAP,
  DIAGRAM_PAD_X,
  formatGroupSeed,
  layoutTrackPositions,
  layoutPlayoffTracks,
  type PlayoffDiagramEdge,
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

interface Connector {
  path: string
  kind: PlayoffDiagramEdge['kind']
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

function unlockExportOverflow(root: HTMLElement): () => void {
  const elements = [
    root,
    ...root.querySelectorAll<HTMLElement>(
      '[data-export-expand], [data-diagram-zoom], [data-diagram-zoom-frame]',
    ),
  ]
  const previous = elements.map((el) => [el, el.style.cssText] as const)
  for (const el of elements) {
    el.style.overflow = 'visible'
    el.style.maxHeight = 'none'
    el.style.maxWidth = 'none'
    el.style.height = 'auto'
    if (getComputedStyle(el).display === 'none') {
      el.style.display = 'block'
    }
  }
  root.querySelectorAll<HTMLElement>('[data-diagram-zoom]').forEach((el) => {
    el.style.transform = 'none'
  })
  root.querySelectorAll<HTMLElement>('[data-diagram-zoom-frame]').forEach((frame) => {
    const inner = frame.querySelector<HTMLElement>('[data-diagram-zoom]')
    if (!inner) return
    frame.style.width = inner.style.width || `${inner.offsetWidth}px`
    frame.style.height = inner.style.height || `${inner.offsetHeight}px`
  })
  root.style.width = 'max-content'
  root.style.minWidth = '100%'
  return () => {
    for (const [el, css] of previous) el.style.cssText = css
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
  const restore = unlockExportOverflow(node)
  try {
    await waitAnimationFrames(2)
    const { domToBlob } = await import('modern-screenshot')
    const width = Math.ceil(Math.max(node.scrollWidth, node.offsetWidth))
    const height = Math.ceil(Math.max(node.scrollHeight, node.offsetHeight))
    const ios = isIosDevice()
    const blob = await domToBlob(node, {
      scale: ios ? 1 : 2,
      backgroundColor: '#070b14',
      width,
      height,
      font: false,
      maximumCanvasSize: ios ? 4096 : 8192,
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
      className="flex w-full min-h-0 shrink-0 flex-col border-b border-white/10 lg:h-auto lg:max-h-none lg:w-[17.5rem] lg:border-b-0 lg:border-r"
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left lg:pointer-events-none"
      >
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">
            Vòng bảng
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {groups.length} bảng · xếp theo hạng
          </p>
        </div>
        <span className="rounded-md border border-white/15 px-2 py-1 text-[11px] font-semibold text-slate-200 lg:hidden">
          {open ? 'Ẩn' : 'Hiện'}
        </span>
      </button>
      <div
        data-export-expand
        className={cn(
          'min-h-0 space-y-3 overflow-auto px-3 py-3',
          open ? 'max-h-[32vh]' : 'hidden',
          'lg:block lg:max-h-none lg:flex-1',
        )}
      >
        {groups.map((group) => (
          <section key={group.group}>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-200/90">
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
                        ? 'border-emerald-400/40 bg-emerald-500/10'
                        : appearance?.bracket === 'placement'
                          ? 'border-amber-400/40 bg-amber-500/10'
                          : 'border-white/10 bg-white/5 opacity-60',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-emerald-200/80">
                          {seed}
                          {number > 0 ? ` · Cặp ${number}` : ''}
                          {` · ${row.wins}T-${row.losses}B`}
                        </p>
                        <p className="truncate text-xs font-semibold text-white">
                          {pairNames(pair, participants) || '—'}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] font-bold tabular-nums text-slate-300">
                        #{row.rank}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-slate-400">
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

function roundedOrtho(x1: number, y1: number, x2: number, y2: number, busX: number): string {
  const r = 10
  const bus = Math.max(x1 + 16, Math.min(busX, x2 - 16))
  if (Math.abs(y2 - y1) < 6) {
    return `M ${x1} ${y1} H ${x2}`
  }
  const dir = y2 > y1 ? 1 : -1
  if (Math.abs(y2 - y1) < r * 2) {
    return `M ${x1} ${y1} H ${bus} V ${y2} H ${x2}`
  }
  return [
    `M ${x1} ${y1}`,
    `H ${bus - r}`,
    `Q ${bus} ${y1} ${bus} ${y1 + dir * r}`,
    `V ${y2 - dir * r}`,
    `Q ${bus} ${y2} ${bus + r} ${y2}`,
    `H ${x2}`,
  ].join(' ')
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
        'relative flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5',
        won ? 'bg-emerald-400/20' : lost ? 'bg-black/25 opacity-70' : 'bg-white/5',
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-emerald-200/80">
          {pair
            ? `Cặp ${pairNumber || '—'}${seed ? ` · ${seed}` : ''}`
            : 'Chờ đội'}
        </p>
        <p className="truncate text-[13px] font-semibold text-white">
          {pair ? label || waitingLabel : waitingLabel}
        </p>
      </div>
      {score !== undefined && (
        <span
          className={cn(
            'tabular-nums text-base font-bold',
            won ? 'text-emerald-300' : 'text-white/70',
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
        'relative w-[252px] rounded-2xl border px-2.5 py-2 shadow-[0_0_24px_rgba(34,211,238,0.08)]',
        match.completed
          ? 'border-emerald-400/60 bg-slate-900/95'
          : 'border-cyan-400/40 bg-slate-900/95',
      )}
    >
      <span data-port="W" className="pointer-events-none absolute right-0 top-[32%] h-px w-px" />
      <span data-port="L" className="pointer-events-none absolute right-0 top-[72%] h-px w-px" />
      {stageLabel && (
        <p className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">
          {stageLabel}
        </p>
      )}
      {!stageLabel && (
        <p className="mb-1.5 truncate text-[10px] font-bold uppercase tracking-wider text-cyan-200">
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
  const contentRef = useRef<HTMLDivElement>(null)
  const [connectors, setConnectors] = useState<Connector[]>([])
  const layout = useMemo(() => layoutTrackPositions(track), [track])

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

  const redraw = () => {
    const root = contentRef.current
    if (!root) return
    const rootRect = root.getBoundingClientRect()
    const scale = zoom || 1

    const pointOf = (el: Element | null) => {
      if (!(el instanceof HTMLElement)) return null
      const rect = el.getBoundingClientRect()
      return {
        x: (rect.left + rect.width / 2 - rootRect.left) / scale,
        y: (rect.top + rect.height / 2 - rootRect.top) / scale,
      }
    }

    const busByDest = new Map<string, { W: number; L: number }>()
    for (const edge of track.edges) {
      const fromEl = root.querySelector(`[data-diagram-match="${edge.fromId}"]`)
      if (!(fromEl instanceof HTMLElement)) continue
      const fromRect = fromEl.getBoundingClientRect()
      const fromRight = (fromRect.right - rootRect.left) / scale
      const current = busByDest.get(edge.toId) ?? { W: fromRight + 22, L: fromRight + 46 }
      if (edge.kind === 'W') current.W = Math.min(current.W, fromRight + 22)
      else current.L = Math.min(current.L, fromRight + 48)
      busByDest.set(edge.toId, current)
    }

    const next: Connector[] = []
    for (const edge of track.edges) {
      const fromSlot = root.querySelector(
        `[data-diagram-match="${edge.fromId}"] [data-out="${edge.kind}"]`,
      )
      const fromPort =
        fromSlot ??
        root.querySelector(`[data-diagram-match="${edge.fromId}"] [data-port="${edge.kind}"]`)
      const toPort = root.querySelector(
        `[data-diagram-match="${edge.toId}"] [data-port="in-${edge.toSlot ?? 1}"]`,
      )
      const from = pointOf(fromPort)
      const to = pointOf(toPort)
      if (!from || !to) continue
      const bus = busByDest.get(edge.toId)
      const busX = edge.kind === 'W' ? (bus?.W ?? from.x + 22) : (bus?.L ?? from.x + 48)
      next.push({
        kind: edge.kind,
        path: roundedOrtho(from.x, from.y, to.x, to.y, busX),
      })
    }
    setConnectors(next)
  }

  useLayoutEffect(() => {
    redraw()
    const frame = window.requestAnimationFrame(() => redraw())
    const root = contentRef.current
    if (!root) return () => window.cancelAnimationFrame(frame)
    const observer = new ResizeObserver(() => redraw())
    observer.observe(root)
    window.addEventListener('resize', redraw)
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', redraw)
    }
  }, [track, layout, zoom])

  const canvasHeight = layout.height + 28

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3 px-1">
        <h4 className="text-sm font-semibold tracking-wide text-cyan-100">{track.title}</h4>
        <p className="text-[11px] text-slate-400">{track.matchIds.length} trận</p>
      </div>

      <div
        data-export-expand
        data-diagram-zoom-frame
        className="relative"
        style={{ width: layout.width * zoom, height: canvasHeight * zoom }}
      >
        <div
          ref={contentRef}
          data-diagram-zoom
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: layout.width,
            height: canvasHeight,
            transform: `scale(${zoom})`,
          }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
            {track.columns.map((column, index) =>
              column.label ? (
                <p
                  key={`${track.id}-h-${index}`}
                  className="absolute text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300"
                  style={{
                    left: DIAGRAM_PAD_X + index * (DIAGRAM_CARD_WIDTH + DIAGRAM_COL_GAP),
                    width: DIAGRAM_CARD_WIDTH,
                    textAlign: 'center',
                  }}
                >
                  {column.label}
                </p>
              ) : null,
            )}
          </div>

          <svg
            className="pointer-events-none absolute inset-0 z-0"
            width={layout.width}
            height={layout.height + 28}
            aria-hidden
          >
            {connectors.map((connector, index) => (
              <path
                key={`${connector.kind}-${index}`}
                d={connector.path}
                fill="none"
                stroke={connector.kind === 'W' ? '#34d399' : '#fbbf24'}
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeOpacity={connector.kind === 'W' ? 0.95 : 0.85}
              />
            ))}
          </svg>

          {[...layout.positions.values()].map((pos) => {
            const match = matchesById.get(pos.matchId)
            if (!match) return null
            return (
              <div
                key={match.id}
                className="absolute z-10"
                style={{ left: pos.x, top: pos.y }}
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
            )
          })}
        </div>
      </div>
    </section>
  )
}

const MIN_ZOOM = 0.5
const MAX_ZOOM = 1.5
const ZOOM_STEP = 0.1

function defaultZoom(): number {
  if (typeof window === 'undefined') return 1
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
    return () => {
      document.body.style.overflow = previous
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
    const node = exportRef.current
    if (!node || downloading || tracks.length === 0) return
    setDownloading(true)
    try {
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
    <div className="fixed inset-0 z-50 flex items-stretch justify-center overscroll-none sm:items-center sm:p-5">
      <div className="absolute inset-0 bg-slate-950/90 sm:bg-slate-950/80" onClick={onClose} />
      <div
        ref={exportRef}
        className="relative flex h-dvh w-full max-w-6xl flex-col overflow-hidden bg-[#070b14] sm:h-auto sm:max-h-[min(94dvh,56rem)] sm:rounded-2xl sm:border sm:border-cyan-500/20 sm:shadow-2xl"
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:items-start sm:px-6 sm:py-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-white sm:text-lg">
              Sơ đồ playoff
            </h3>
            <p className="mt-0.5 hidden text-xs text-slate-400 sm:block">
              Thắng đi tiếp (xanh) · thua sang nhánh phụ (vàng) — trận sau nằm giữa hai trận nuôi
            </p>
            {isPreview && (
              <p className="mt-1 text-[11px] text-amber-300 sm:text-xs">
                Sơ đồ dự kiến từ BXH — tạo bracket để lưu trận và nhập kết quả.
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2" data-export-hide>
            <button
              type="button"
              onClick={() => void handleDownloadImage()}
              disabled={downloading || tracks.length === 0}
              className="min-h-10 rounded-lg bg-cyan-400 px-2.5 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-sm"
            >
              {downloading ? 'Đang tải…' : 'Tải ảnh'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-10 rounded-lg border border-white/15 px-2.5 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 sm:px-3 sm:text-sm"
            >
              Đóng
            </button>
          </div>
        </header>

        <div
          className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-1.5 sm:hidden"
          data-export-hide
        >
          <p className="text-[11px] text-slate-400">Vuốt ngang / dọc để xem hết nhánh</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Thu nhỏ"
              onClick={() => bumpZoom(-ZOOM_STEP)}
              disabled={zoom <= MIN_ZOOM}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-white/15 text-sm font-bold text-white disabled:opacity-40"
            >
              −
            </button>
            <span className="w-10 text-center text-[11px] tabular-nums text-slate-300">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              aria-label="Phóng to"
              onClick={() => bumpZoom(ZOOM_STEP)}
              disabled={zoom >= MAX_ZOOM}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-white/15 text-sm font-bold text-white disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>

        <div data-export-expand className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <GroupStageTeamsPanel
            standingsGroups={standingsGroups}
            pairs={pairs}
            participants={participants}
            pairNumberById={pairNumberById}
            matches={matches}
          />
          <div
            data-export-expand
            className="min-h-0 min-w-0 flex-1 space-y-8 overflow-auto overscroll-contain px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:space-y-10 sm:px-5 sm:py-4 [-webkit-overflow-scrolling:touch]"
          >
            {tracks.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">
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
                  zoom={zoom}
                />
              ))
            )}
          </div>
        </div>

        {imagePreview && (
          <div
            className="absolute inset-0 z-20 flex flex-col bg-[#070b14] pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            data-export-hide
          >
            <div className="flex shrink-0 items-center gap-2 px-3 py-2">
              <p className="min-w-0 flex-1 text-sm font-semibold text-white">
                Nhấn giữ ảnh để lưu
              </p>
              <button
                type="button"
                onClick={() => void handleSharePreview()}
                className="min-h-10 rounded-lg bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950"
              >
                Lưu / Chia sẻ
              </button>
              <button
                type="button"
                onClick={closeImagePreview}
                className="min-h-10 rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-slate-200"
              >
                Đóng
              </button>
            </div>
            <p className="shrink-0 px-3 pb-2 text-[11px] text-slate-400">
              iPhone không tải file trực tiếp — bấm Lưu / Chia sẻ rồi chọn Lưu ảnh, hoặc nhấn giữ ảnh.
            </p>
            <div className="min-h-0 flex-1 overflow-auto overscroll-contain px-3">
              <img
                src={imagePreview.url}
                alt="Sơ đồ playoff"
                className="mx-auto max-w-full select-auto rounded-lg"
                style={{ WebkitTouchCallout: 'default', WebkitUserSelect: 'auto' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
