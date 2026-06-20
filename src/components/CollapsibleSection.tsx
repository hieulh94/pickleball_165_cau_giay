import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

interface CollapsibleSectionProps {
  id?: string
  title: string
  description?: string
  visible: boolean
  onToggle?: () => void
  headerExtra?: ReactNode
  children: ReactNode
  className?: string
}

export function CollapsibleSection({
  id,
  title,
  description,
  visible,
  onToggle,
  headerExtra,
  children,
  className,
}: CollapsibleSectionProps) {
  if (!visible && !onToggle) return null

  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-12 rounded-xl border border-border bg-card shadow-sm',
        !visible && onToggle && 'border-dashed',
        className ?? 'mt-0',
      )}
    >
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 landscape-short:gap-2 landscape-short:px-3 landscape-short:py-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 w-full sm:flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[22px] font-semibold leading-tight text-text-primary landscape-short:text-lg">{title}</h2>
            {!visible && onToggle && (
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-text-secondary">
                Đang ẩn
              </span>
            )}
          </div>
          {description && visible && (
            <p className="mt-0.5 text-xs leading-relaxed text-text-secondary landscape-short:line-clamp-2">{description}</p>
          )}
        </div>
        {(headerExtra || onToggle) && (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
            {headerExtra}
            {onToggle && (
              <button
                type="button"
                onClick={onToggle}
                className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-surface-muted"
                aria-expanded={visible}
              >
                {visible ? 'Ẩn' : 'Hiện'}
              </button>
            )}
          </div>
        )}
      </div>

      {visible && <div className="p-4 landscape-short:p-3">{children}</div>}
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
  contribution: 'Beer cống hiến',
}

export const DEFAULT_SECTION_VISIBILITY: Record<SectionKey, boolean> = {
  participants: true,
  pairs: true,
  schedule: true,
  standings: true,
  playoffs: false,
  contribution: true,
}
