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

const SECTION_SHORT_LABELS: Record<SectionKey, string> = {
  participants: 'Người',
  pairs: 'Cặp',
  schedule: 'Lịch',
  standings: 'BXH',
  playoffs: 'Playoff',
  contribution: 'Tiền',
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
  dialogSections?: SectionKey[]
  onDialogOpen?: (key: SectionKey) => void
}

export function SectionToggleBar({
  visibility,
  onToggle,
  onShowAll,
  onHideAll,
  availableSections,
  dialogSections = [],
  onDialogOpen,
}: SectionToggleBarProps) {
  const buttonClass = (active: boolean, isDialog: boolean) => {
    if (isDialog) {
      return 'border border-emerald-500 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
    }
    if (active) {
      return 'bg-green-600 text-white hover:bg-green-700'
    }
    return 'border border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100'
  }

  return (
    <div className="z-30 mt-2 rounded-lg border border-slate-200 bg-white px-2 py-2 shadow-sm sm:mt-4 sm:rounded-xl sm:p-3">
      <p className="mb-1.5 hidden text-xs font-medium uppercase tracking-wide text-slate-500 sm:mb-2 sm:block">
        Ẩn / Hiện danh mục
      </p>
      <div className="-mx-2 flex items-center gap-1.5 overflow-x-auto px-2 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:gap-2 sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
        {availableSections.map((key) => {
          const isDialog = dialogSections.includes(key)
          const isVisible = visibility[key]
          return (
            <button
              key={key}
              type="button"
              onClick={() => (isDialog ? onDialogOpen?.(key) : onToggle(key))}
              className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium transition sm:rounded-lg sm:px-3 sm:py-1.5 sm:text-sm ${buttonClass(isVisible, isDialog)}`}
            >
              <span className="sm:hidden">{SECTION_SHORT_LABELS[key]}</span>
              <span className="hidden sm:inline">{SECTION_LABELS[key]}</span>
            </button>
          )
        })}
        <span className="mx-0.5 hidden h-5 w-px shrink-0 self-center bg-slate-200 sm:mx-1 sm:inline" />
        <button
          type="button"
          onClick={onShowAll}
          className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 sm:rounded-lg sm:px-3 sm:py-1.5 sm:text-sm"
        >
          <span className="sm:hidden">Tất cả</span>
          <span className="hidden sm:inline">Hiện tất cả</span>
        </button>
        <button
          type="button"
          onClick={onHideAll}
          className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 sm:rounded-lg sm:px-3 sm:py-1.5 sm:text-sm"
        >
          <span className="sm:hidden">Ẩn hết</span>
          <span className="hidden sm:inline">Ẩn tất cả</span>
        </button>
      </div>
    </div>
  )
}
