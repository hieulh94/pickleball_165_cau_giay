export type PairColorTheme = {
  border: string
  bg: string
  text: string
  badge: string
  swatch: string
}

/** Muted pair palette — distinguishable but lower saturation than legacy rainbow */
export const PAIR_COLOR_PALETTE: PairColorTheme[] = [
  {
    border: 'border-primary-300',
    bg: 'bg-primary-50',
    text: 'text-primary-900',
    badge: 'bg-primary-600',
    swatch: 'border-primary-400 bg-primary-200',
  },
  {
    border: 'border-secondary-300',
    bg: 'bg-secondary-50',
    text: 'text-secondary-700',
    badge: 'bg-secondary-600',
    swatch: 'border-secondary-400 bg-secondary-50',
  },
  {
    border: 'border-sky-300',
    bg: 'bg-sky-50',
    text: 'text-sky-900',
    badge: 'bg-sky-600',
    swatch: 'border-sky-300 bg-sky-100',
  },
  {
    border: 'border-amber-300',
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    badge: 'bg-amber-600',
    swatch: 'border-amber-300 bg-amber-100',
  },
  {
    border: 'border-rose-300',
    bg: 'bg-rose-50',
    text: 'text-rose-900',
    badge: 'bg-rose-600',
    swatch: 'border-rose-300 bg-rose-100',
  },
  {
    border: 'border-cyan-300',
    bg: 'bg-cyan-50',
    text: 'text-cyan-900',
    badge: 'bg-cyan-600',
    swatch: 'border-cyan-300 bg-cyan-100',
  },
  {
    border: 'border-indigo-300',
    bg: 'bg-indigo-50',
    text: 'text-indigo-900',
    badge: 'bg-indigo-600',
    swatch: 'border-indigo-300 bg-indigo-100',
  },
  {
    border: 'border-orange-300',
    bg: 'bg-orange-50',
    text: 'text-orange-900',
    badge: 'bg-orange-600',
    swatch: 'border-orange-300 bg-orange-100',
  },
  {
    border: 'border-teal-300',
    bg: 'bg-teal-50',
    text: 'text-teal-900',
    badge: 'bg-teal-600',
    swatch: 'border-teal-300 bg-teal-100',
  },
  {
    border: 'border-neutral-400',
    bg: 'bg-neutral-100',
    text: 'text-neutral-800',
    badge: 'bg-neutral-600',
    swatch: 'border-neutral-400 bg-neutral-200',
  },
]

export function getPairColor(pairNumber: number): PairColorTheme {
  if (pairNumber < 1) return PAIR_COLOR_PALETTE[0]
  return PAIR_COLOR_PALETTE[(pairNumber - 1) % PAIR_COLOR_PALETTE.length]
}

export function pairCardClassName(pairNumber: number) {
  const color = getPairColor(pairNumber)
  return `rounded-xl border-2 ${color.border} ${color.bg} px-4 py-3 text-sm font-semibold ${color.text} shadow-sm`
}
