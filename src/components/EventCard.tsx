import type { PickleballEvent } from '../types'
import { Button } from './ui/Button'
import { DropdownMenu } from './ui/DropdownMenu'
import { cn } from '../lib/cn'

interface EventCardProps {
  event: PickleballEvent
  onManage: (event: PickleballEvent) => void
  onDelete: (event: PickleballEvent) => void
}

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3" aria-hidden>
      <path d="M4.75 7h-.5A1.75 1.75 0 0 0 2.5 8.75v4.5c0 .966.784 1.75 1.75 1.75h7.5A1.75 1.75 0 0 0 13.5 13.25v-4.5A1.75 1.75 0 0 0 11.75 7h-.5v-1.25a3.25 3.25 0 1 0-6.5 0V7Zm1.5 0v-1.25a1.75 1.75 0 1 1 3.5 0V7h-3.5Z" />
    </svg>
  )
}

export function EventCard({ event, onManage, onDelete }: EventCardProps) {
  const isShowmatch = event.eventType === 'showmatch'
  const isPrivate = Boolean(event.accessPassword)
  const createdLabel = new Date(event.createdAt).toLocaleDateString('vi-VN')

  const handleShare = async () => {
    const url = `${window.location.origin}/event/${event.id}`
    try {
      await navigator.clipboard.writeText(url)
      alert('Đã sao chép link event.')
    } catch {
      alert(url)
    }
  }

  return (
    <article className="group flex flex-col rounded-xl border border-border bg-card p-3.5 shadow-sm transition duration-200 hover:border-primary-200 hover:shadow-md sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 text-base font-semibold leading-snug tracking-tight text-text-primary">
          {event.name}
        </h3>
        <span
          className={cn(
            'shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            isShowmatch ? 'bg-primary-50 text-primary-700' : 'bg-secondary-50 text-secondary-700',
          )}
        >
          {isShowmatch ? 'Showmatch' : 'Mini game'}
        </span>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-text-secondary">
        <span>{createdLabel}</span>
        <span className="mx-1.5 text-neutral-300">·</span>
        <span>{event.participants.length} người</span>
        <span className="mx-1.5 text-neutral-300">·</span>
        <span>{event.matches.length} trận</span>
        <span className="mx-1.5 text-neutral-300">·</span>
        <span className="font-mono text-[11px]">#{event.accessCode || '—'}</span>
      </p>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/80 pt-3">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-text-secondary">
          {isPrivate ? (
            <>
              <LockIcon />
              Riêng tư
            </>
          ) : (
            'Công khai'
          )}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={() => onManage(event)}
          >
            Quản lý
          </Button>
          <DropdownMenu
            items={[
              { label: 'Chỉnh sửa', onClick: () => onManage(event) },
              {
                label: 'Nhân bản',
                onClick: () => alert('Tính năng nhân bản sắp có.'),
                disabled: true,
              },
              { label: 'Chia sẻ', onClick: handleShare },
              { label: 'Xóa', onClick: () => onDelete(event), destructive: true },
            ]}
          />
        </div>
      </div>
    </article>
  )
}
