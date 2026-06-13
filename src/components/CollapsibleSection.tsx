import type { ReactNode } from 'react'

interface CollapsibleSectionProps {
  title: string
  description?: string
  visible: boolean
  onToggle: () => void
  headerExtra?: ReactNode
  children: ReactNode
  className?: string
}

export function CollapsibleSection({
  title,
  description,
  visible,
  onToggle,
  headerExtra,
  children,
  className = 'mt-6',
}: CollapsibleSectionProps) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className} ${
        visible ? '' : 'border-dashed'
      }`}
    >
      <div className="flex items-start justify-between gap-3 p-6 pb-0">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            {!visible && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                Đang ẩn
              </span>
            )}
          </div>
          {description && visible && (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {headerExtra}
          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            aria-expanded={visible}
          >
            {visible ? 'Ẩn' : 'Hiện'}
          </button>
        </div>
      </div>

      {visible && <div className="p-6 pt-4">{children}</div>}
    </section>
  )
}

export type SectionKey =
  | 'participants'
  | 'pairs'
  | 'schedule'
  | 'standings'
  | 'playoffs'
  | 'contribution'

export const SECTION_LABELS: Record<SectionKey, string> = {
  participants: 'Người tham gia',
  pairs: 'Cặp đôi',
  schedule: 'Lịch thi đấu',
  standings: 'Bảng xếp hạng',
  playoffs: 'Vòng loại trực tiếp',
  contribution: 'Tiền cống hiến',
}

export const DEFAULT_SECTION_VISIBILITY: Record<SectionKey, boolean> = {
  participants: true,
  pairs: true,
  schedule: true,
  standings: true,
  playoffs: false,
  contribution: true,
}

interface SectionToggleBarProps {
  visibility: Record<SectionKey, boolean>
  onToggle: (key: SectionKey) => void
  onShowAll: () => void
  onHideAll: () => void
  availableSections: SectionKey[]
}

export function SectionToggleBar({
  visibility,
  onToggle,
  onShowAll,
  onHideAll,
  availableSections,
}: SectionToggleBarProps) {
  return (
    <div className="sticky top-[4.5rem] z-40 mt-4 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur-sm">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        Ẩn / Hiện danh mục
      </p>
      <div className="flex flex-wrap gap-2">
        {availableSections.map((key) => {
          const isVisible = visibility[key]
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggle(key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                isVisible
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'border border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {SECTION_LABELS[key]}
            </button>
          )
        })}
        <span className="mx-1 hidden h-6 w-px self-center bg-slate-200 sm:inline" />
        <button
          type="button"
          onClick={onShowAll}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Hiện tất cả
        </button>
        <button
          type="button"
          onClick={onHideAll}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Ẩn tất cả
        </button>
      </div>
    </div>
  )
}
