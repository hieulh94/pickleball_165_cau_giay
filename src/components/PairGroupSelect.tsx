import { getGroupNames } from '../lib/groups'
import { selectClassName } from './ui/styles'

type PairGroupSelectProps = {
  value: string | undefined
  groupCount: number
  onChange: (group: string | undefined) => void
  className?: string
}

export function PairGroupSelect({
  value,
  groupCount,
  onChange,
  className,
}: PairGroupSelectProps) {
  const options = getGroupNames(groupCount)

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      className={className ?? `${selectClassName} text-xs`}
      aria-label="Chọn bảng đấu"
    >
      <option value="">— Chọn bảng —</option>
      {options.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  )
}
