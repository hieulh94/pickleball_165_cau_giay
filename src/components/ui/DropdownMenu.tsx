import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'

export interface DropdownMenuItem {
  label: string
  onClick: () => void
  destructive?: boolean
  disabled?: boolean
}

interface DropdownMenuProps {
  items: DropdownMenuItem[]
  align?: 'left' | 'right'
}

export function DropdownMenu({ items, align = 'right' }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary transition hover:bg-neutral-50 hover:text-text-primary"
        aria-label="Tùy chọn thêm"
        aria-expanded={open}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
          <path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 14a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" />
        </svg>
      </button>

      {open && (
        <div
          className={cn(
            'absolute top-full z-50 mt-1 min-w-[10rem] overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false)
                item.onClick()
              }}
              className={cn(
                'flex w-full px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40',
                item.destructive
                  ? 'text-danger-500 hover:bg-red-50'
                  : 'text-text-primary hover:bg-neutral-50',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
