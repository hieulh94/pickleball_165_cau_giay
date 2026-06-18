import { getSkillLevelBadgeClass } from '../lib/skillLevelStyles'
import type { SkillLevel } from '../types'

type SkillLevelBadgeProps = {
  level: SkillLevel
  className?: string
  short?: boolean
}

export function SkillLevelBadge({ level, className = '', short = true }: SkillLevelBadgeProps) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${getSkillLevelBadgeClass(level)} ${className}`}
    >
      {short ? `TĐ${level}` : `Trình độ ${level}`}
    </span>
  )
}
