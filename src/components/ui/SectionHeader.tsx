import type { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  action?: ReactNode
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">{title}</h2>
      {action}
    </div>
  )
}
