import type { ReactNode } from 'react'
import type { PickleballEvent } from '../types'
import { Button } from './ui/Button'
import { DropdownMenu } from './ui/DropdownMenu'
import { cn } from '../lib/cn'

interface EventCardProps {
  event: PickleballEvent
  onManage: (event: PickleballEvent) => void
  onDelete: (event: PickleballEvent) => void
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden>
      <path d="M4.75 0a.75.75 0 0 1 .75.75V2h5V.75a.75.75 0 0 1 1.5 0V2h.25A2.75 2.75 0 0 1 14.75 4.75v8.5A2.75 2.75 0 0 1 12 16H4a2.75 2.75 0 0 1-2.75-2.75v-8.5A2.75 2.75 0 0 1 4 2h.25V.75A.75.75 0 0 1 4.75 0ZM4 3.5c-.69 0-1.25.56-1.25 1.25v.25h10.5v-.25c0-.69-.56-1.25-1.25-1.25H4Z" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden>
      <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6.5 9.5a4.5 4.5 0 0 0-4.5 4.5.75.75 0 0 0 .75.75h9.5a.75.75 0 0 0 .75-.75 4.5 4.5 0 0 0-4.5-4.5h-2Z" />
    </svg>
  )
}

function MatchIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden>
      <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Z" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path d="M4.75 7h-.5A1.75 1.75 0 0 0 2.5 8.75v4.5c0 .966.784 1.75 1.75 1.75h7.5A1.75 1.75 0 0 0 13.5 13.25v-4.5A1.75 1.75 0 0 0 11.75 7h-.5v-1.25a3.25 3.25 0 1 0-6.5 0V7Zm1.5 0v-1.25a1.75 1.75 0 1 1 3.5 0V7h-3.5Z" />
    </svg>
  )
}

function MetaRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm text-text-secondary">
      {icon}
      <span>{children}</span>
    </div>
  )
}

export function EventCard({ event, onManage, onDelete }: EventCardProps) {
  const isShowmatch = event.eventType === 'showmatch'
  const isPrivate = Boolean(event.accessPassword)

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
    <article className="group flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-[0_8px_24px_rgba(17,24,39,0.08)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 text-lg font-semibold leading-tight tracking-tight text-text-primary sm:text-xl">
          {event.name}
        </h3>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
            isShowmatch ? 'bg-primary-50 text-primary-700' : 'bg-secondary-50 text-secondary-700',
          )}
        >
          {isShowmatch ? 'Showmatch' : 'Mini game'}
        </span>
      </div>

      <div className="mt-4 space-y-1.5">
        <MetaRow icon={<CalendarIcon />}>
          {new Date(event.createdAt).toLocaleDateString('vi-VN')}
        </MetaRow>
        <MetaRow icon={<UsersIcon />}>{event.participants.length} người tham gia</MetaRow>
        <MetaRow icon={<MatchIcon />}>{event.matches.length} trận đấu</MetaRow>
        <p className="pt-1 font-mono text-xs font-medium tracking-wide text-text-secondary">
          #{event.accessCode || '—'}
        </p>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary">
            {isPrivate ? (
              <>
                <LockIcon />
                Riêng tư
              </>
            ) : (
              'Công khai'
            )}
          </span>
          <div className="flex items-center gap-1.5">
            <Button size="sm" onClick={() => onManage(event)}>
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
      </div>
    </article>
  )
}
