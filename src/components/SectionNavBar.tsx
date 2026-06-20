import { useEffect, useRef, useState } from 'react'
import { cn } from '../lib/cn'
import { SECTION_LABELS, type SectionKey } from './CollapsibleSection'

interface SectionNavBarProps {
  availableSections: SectionKey[]
  visibility: Record<SectionKey, boolean>
  onSetVisibility: (key: SectionKey, visible: boolean) => void
  onShowAll: () => void
  onHideAll: () => void
  dialogSections?: SectionKey[]
  onDialogOpen?: (key: SectionKey) => void
}

export function SectionNavBar({
  availableSections,
  visibility,
  onSetVisibility,
  onShowAll,
  onHideAll,
  dialogSections = [],
  onDialogOpen,
}: SectionNavBarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!settingsOpen) return
    const handleClick = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [settingsOpen])

  const scrollToSection = (key: SectionKey) => {
    if (dialogSections.includes(key)) {
      onDialogOpen?.(key)
      return
    }
    const el = document.getElementById(`section-${key}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="sticky top-0 z-20 border-b border-border bg-card/95 py-2 backdrop-blur-sm landscape-short:py-1">
      <div className="flex items-center gap-2">
        <nav
          className="flex min-w-0 flex-1 gap-1 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Điều hướng danh mục"
        >
          {availableSections.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => scrollToSection(key)}
              className={cn(
                'shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition landscape-short:px-2 landscape-short:py-1 landscape-short:text-xs',
                visibility[key]
                  ? 'text-text-primary hover:bg-surface-muted'
                  : 'text-text-secondary/60 line-through hover:bg-surface-muted',
              )}
            >
              {SECTION_LABELS[key]}
            </button>
          ))}
        </nav>

        <div ref={settingsRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setSettingsOpen((o) => !o)}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-surface-muted hover:text-text-primary"
            aria-expanded={settingsOpen}
            aria-haspopup="true"
          >
            <span aria-hidden>⚙</span>
            <span className="hidden sm:inline">Hiển thị</span>
          </button>

          {settingsOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-xl border border-border bg-card p-3 shadow-lg">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Danh mục hiển thị
              </p>
              <ul className="space-y-1">
                {availableSections.map((key) => (
                  <li key={key}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-muted">
                      <input
                        type="checkbox"
                        checked={visibility[key]}
                        onChange={(e) => onSetVisibility(key, e.target.checked)}
                        className="size-4 rounded border-border text-primary-600 focus:ring-primary-500"
                      />
                      {SECTION_LABELS[key]}
                    </label>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex gap-2 border-t border-border pt-2">
                <button
                  type="button"
                  onClick={onShowAll}
                  className="flex-1 rounded-lg px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50"
                >
                  Chọn tất cả
                </button>
                <button
                  type="button"
                  onClick={onHideAll}
                  className="flex-1 rounded-lg px-2 py-1 text-xs font-medium text-text-secondary hover:bg-surface-muted"
                >
                  Bỏ chọn tất cả
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
