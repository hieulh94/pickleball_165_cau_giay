import { useEffect, useMemo, useRef, useState } from 'react'
import { getPairColor } from '../lib/pairColors'
import type { Match, Pair, Participant } from '../types'

interface GroupScheduleDiagramDialogProps {
  open: boolean
  eventName: string
  matches: Match[]
  pairs: Pair[]
  participants: Participant[]
  pairNumberById: Map<string, number>
  splitGroups: boolean
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

  const scroll = root.querySelector<HTMLElement>('[data-export-scroll]')
  if (scroll) {
    remember(scroll)
    scroll.style.overflow = 'visible'
    scroll.style.maxHeight = 'none'
    scroll.style.maxWidth = 'none'
    scroll.style.height = 'auto'
    scroll.style.minHeight = 'auto'
    scroll.style.flex = 'none'
  }

  const body = root.querySelector<HTMLElement>('[data-export-body]')
  if (body) {
    remember(body)
    body.style.display = 'flex'
    body.style.flexDirection = 'row'
    body.style.alignItems = 'flex-start'
    body.style.width = 'max-content'
    body.style.minWidth = 'max-content'
    body.style.maxWidth = 'none'
    body.style.height = 'auto'
    body.style.minHeight = 'auto'
    body.style.overflow = 'visible'
    body.style.flex = 'none'
  }

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
    .querySelectorAll<HTMLElement>('[data-export-scroll], [data-export-body]')
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
    await navigator.share({ files: [file], title: 'Lịch thi đấu vòng bảng' })
    return true
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return true
    return false
  }
}

function pairNameLines(pair: Pair | undefined, participants: Participant[]): { line1: string; line2: string } {
  if (!pair) return { line1: '—', line2: '' }
  const p1 = participants.find((p) => p.id === pair.player1Id)
  const p2 = participants.find((p) => p.id === pair.player2Id)
  if (!p1 && !p2) return { line1: '—', line2: '' }
  return { line1: p1?.name ?? '—', line2: p2?.name ?? '' }
}

function PairMini({
  pair,
  pairNumber,
  participants,
}: {
  pair: Pair | undefined
  pairNumber: number
  participants: Participant[]
}) {
  if (!pair || pairNumber < 1) {
    return (
      <div className="flex min-h-[4.5rem] flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-2 text-center text-xs text-neutral-400">
        —
      </div>
    )
  }

  const color = getPairColor(pairNumber)
  const names = pairNameLines(pair, participants)

  return (
    <div
      className={`flex min-h-[4.5rem] flex-col items-center justify-center rounded-xl border-2 px-2 py-2 text-center ${color.border} ${color.bg}`}
    >
      <p className={`text-[11px] font-bold ${color.text}`}>Cặp {pairNumber}</p>
      <p className={`mt-0.5 w-full break-words text-[11px] font-semibold leading-tight ${color.text}`}>
        {names.line1}
      </p>
      {names.line2 ? (
        <p className={`w-full break-words text-[11px] font-semibold leading-tight ${color.text}`}>
          {names.line2}
        </p>
      ) : null}
    </div>
  )
}

export function GroupScheduleDiagramDialog({
  open,
  eventName,
  matches,
  pairs,
  participants,
  pairNumberById,
  splitGroups,
  onClose,
}: GroupScheduleDiagramDialogProps) {
  const exportRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [imagePreview, setImagePreview] = useState<{
    url: string
    fileName: string
    blob: Blob
  } | null>(null)

  const rounds = useMemo(() => {
    const grouped = new Map<number, Match[]>()
    for (const match of matches) {
      const list = grouped.get(match.round) ?? []
      list.push(match)
      grouped.set(match.round, list)
    }
    return [...grouped.entries()]
      .sort(([a], [b]) => a - b)
      .map(([round, roundMatches]) => {
        const sorted = [...roundMatches].sort(
          (a, b) => a.court - b.court || a.id.localeCompare(b.id),
        )
        const playing = new Set(
          sorted.flatMap((match) =>
            [match.pair1Id, match.pair2Id].filter((id): id is string => !!id),
          ),
        )
        const resting = pairs.filter((pair) => !playing.has(pair.id))
        return { round, matches: sorted, resting }
      })
  }, [matches, pairs])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

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
    if (downloading || rounds.length === 0) return
    setDownloading(true)
    try {
      await waitAnimationFrames(3)
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 50)
      })
      const node = exportRef.current
      if (!node) throw new Error('missing diagram')
      const blob = await captureDiagramPng(node)
      const fileName = `lich-vong-bang-${todayStamp()}.png`
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
              Lịch thi đấu vòng bảng
            </h3>
            <p className="mt-0.5 hidden truncate text-xs text-neutral-500 sm:block">
              {eventName}
              {rounds.length > 0
                ? ` · ${rounds.length} vòng · ${matches.length} trận`
                : ''}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2" data-export-hide>
            <button
              type="button"
              onClick={() => void handleDownloadImage()}
              disabled={downloading || rounds.length === 0}
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
          data-export-scroll
          className="min-h-0 flex-1 overflow-auto overscroll-contain px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-4 [-webkit-overflow-scrolling:touch]"
        >
          {rounds.length === 0 ? (
            <p className="py-10 text-center text-sm text-neutral-500">
              Chưa có trận vòng bảng để xem lịch.
            </p>
          ) : (
            <div data-export-body className="flex w-max items-start gap-4 sm:gap-5">
              {rounds.map(({ round, matches: roundMatches, resting }) => (
                <section
                  key={round}
                  className="w-[17.5rem] shrink-0 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm"
                >
                  <div className="mb-3 flex items-baseline justify-between gap-2">
                    <h4 className="text-sm font-bold uppercase tracking-wide text-emerald-700">
                      Vòng {round}
                    </h4>
                    <span className="text-[11px] text-neutral-500">
                      {roundMatches.length} trận
                      {roundMatches.filter((match) => match.completed).length > 0
                        ? ` · ${roundMatches.filter((match) => match.completed).length} xong`
                        : ''}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {roundMatches.map((match) => {
                      const pair1 = match.pair1Id
                        ? pairs.find((pair) => pair.id === match.pair1Id)
                        : undefined
                      const pair2 = match.pair2Id
                        ? pairs.find((pair) => pair.id === match.pair2Id)
                        : undefined
                      const pair1Number = match.pair1Id
                        ? (pairNumberById.get(match.pair1Id) ?? 0)
                        : 0
                      const pair2Number = match.pair2Id
                        ? (pairNumberById.get(match.pair2Id) ?? 0)
                        : 0

                      return (
                        <article
                          key={match.id}
                          className={`rounded-xl border p-2.5 ${
                            match.completed
                              ? 'border-emerald-200 bg-emerald-50'
                              : 'border-neutral-200 bg-neutral-50'
                          }`}
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-1.5">
                            <span className="rounded-md bg-neutral-800 px-2 py-0.5 text-[10px] font-bold text-white">
                              Sân {match.court}
                            </span>
                            {splitGroups && match.group ? (
                              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                {match.group}
                              </span>
                            ) : null}
                            {match.completed ? (
                              <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                                Xong
                              </span>
                            ) : null}
                          </div>
                          <div className="grid grid-cols-[minmax(0,1fr)_1.75rem_minmax(0,1fr)] items-stretch gap-1.5">
                            <PairMini
                              pair={pair1}
                              pairNumber={pair1Number}
                              participants={participants}
                            />
                            <div className="flex items-center justify-center">
                              <span className="text-[10px] font-bold text-neutral-500">VS</span>
                            </div>
                            <PairMini
                              pair={pair2}
                              pairNumber={pair2Number}
                              participants={participants}
                            />
                          </div>
                          {match.completed ? (
                            <p className="mt-2 text-center text-lg font-bold tabular-nums text-emerald-700">
                              {match.score1} – {match.score2}
                            </p>
                          ) : null}
                        </article>
                      )
                    })}
                  </div>
                  {resting.length > 0 ? (
                    <p className="mt-3 text-[11px] leading-relaxed text-neutral-500">
                      Nghỉ:{' '}
                      {resting
                        .map((pair) => `Cặp ${pairNumberById.get(pair.id) ?? 0}`)
                        .join(', ')}
                    </p>
                  ) : null}
                </section>
              ))}
            </div>
          )}
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
                alt="Lịch thi đấu vòng bảng"
                className="mx-auto max-w-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
