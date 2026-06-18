import type { SkillLevel } from '../types'

const SKILL_LEVEL_STYLES: Record<
  SkillLevel,
  { badge: string; toggleActive: string; toggleInactive: string }
> = {
  1: {
    badge: 'bg-sky-100 text-sky-800 border border-sky-200',
    toggleActive: 'border-sky-400 bg-sky-100 text-sky-800 ring-2 ring-sky-300',
    toggleInactive:
      'border-neutral-300 bg-white text-neutral-600 hover:border-sky-300 hover:bg-sky-50',
  },
  2: {
    badge: 'bg-amber-100 text-amber-900 border border-amber-200',
    toggleActive: 'border-amber-400 bg-amber-100 text-amber-900 ring-2 ring-amber-300',
    toggleInactive:
      'border-neutral-300 bg-white text-neutral-600 hover:border-amber-300 hover:bg-amber-50',
  },
}

export function getSkillLevelBadgeClass(level: SkillLevel): string {
  return SKILL_LEVEL_STYLES[level].badge
}

export function getSkillLevelToggleClass(level: SkillLevel, active: boolean): string {
  return active ? SKILL_LEVEL_STYLES[level].toggleActive : SKILL_LEVEL_STYLES[level].toggleInactive
}
