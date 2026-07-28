import {
  formatClubPlayerGender,
  formatGenderSkillLabel,
  type ClubPlayerGender,
} from '../lib/clubPlayers'
import { getSkillLevelBadgeClass } from '../lib/skillLevelStyles'
import type { SkillLevel } from '../types'

type SkillLevelBadgeProps = {
  level: SkillLevel
  gender?: ClubPlayerGender
  className?: string
  short?: boolean
}

export function SkillLevelBadge({
  level,
  gender,
  className = '',
  short = true,
}: SkillLevelBadgeProps) {
  const label = gender
    ? short
      ? formatGenderSkillLabel(gender, level)
      : `${formatClubPlayerGender(gender)} · Trình độ ${level}`
    : short
      ? `TĐ${level}`
      : `Trình độ ${level}`

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${getSkillLevelBadgeClass(level)} ${className}`}
    >
      {label}
    </span>
  )
}
