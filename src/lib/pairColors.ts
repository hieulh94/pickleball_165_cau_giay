export type PairColorTheme = {
  border: string
  bg: string
  text: string
  badge: string
  swatch: string
}

export const PAIR_COLOR_PALETTE: PairColorTheme[] = [
  {
    border: 'border-violet-500',
    bg: 'bg-violet-100',
    text: 'text-violet-950',
    badge: 'bg-violet-600',
    swatch: 'border-violet-500 bg-violet-200',
  },
  {
    border: 'border-sky-500',
    bg: 'bg-sky-100',
    text: 'text-sky-950',
    badge: 'bg-sky-600',
    swatch: 'border-sky-500 bg-sky-200',
  },
  {
    border: 'border-emerald-500',
    bg: 'bg-emerald-100',
    text: 'text-emerald-950',
    badge: 'bg-emerald-600',
    swatch: 'border-emerald-500 bg-emerald-200',
  },
  {
    border: 'border-amber-500',
    bg: 'bg-amber-100',
    text: 'text-amber-950',
    badge: 'bg-amber-600',
    swatch: 'border-amber-500 bg-amber-200',
  },
  {
    border: 'border-rose-500',
    bg: 'bg-rose-100',
    text: 'text-rose-950',
    badge: 'bg-rose-600',
    swatch: 'border-rose-500 bg-rose-200',
  },
  {
    border: 'border-cyan-500',
    bg: 'bg-cyan-100',
    text: 'text-cyan-950',
    badge: 'bg-cyan-600',
    swatch: 'border-cyan-500 bg-cyan-200',
  },
  {
    border: 'border-fuchsia-500',
    bg: 'bg-fuchsia-100',
    text: 'text-fuchsia-950',
    badge: 'bg-fuchsia-600',
    swatch: 'border-fuchsia-500 bg-fuchsia-200',
  },
  {
    border: 'border-orange-500',
    bg: 'bg-orange-100',
    text: 'text-orange-950',
    badge: 'bg-orange-600',
    swatch: 'border-orange-500 bg-orange-200',
  },
  {
    border: 'border-teal-500',
    bg: 'bg-teal-100',
    text: 'text-teal-950',
    badge: 'bg-teal-600',
    swatch: 'border-teal-500 bg-teal-200',
  },
  {
    border: 'border-indigo-500',
    bg: 'bg-indigo-100',
    text: 'text-indigo-950',
    badge: 'bg-indigo-600',
    swatch: 'border-indigo-500 bg-indigo-200',
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
