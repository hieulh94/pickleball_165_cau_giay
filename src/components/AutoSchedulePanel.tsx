interface AutoSchedulePanelProps {
  pairCount: number
  courts: number[]
  hasExistingSchedule: boolean
  onGenerate: () => void
}

export function AutoSchedulePanel({
  pairCount,
  courts,
  hasExistingSchedule,
  onGenerate,
}: AutoSchedulePanelProps) {
  return (
    <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/50 p-4 sm:p-5">
      <p className="text-sm text-blue-900">
        Hệ thống sẽ tự động tạo lịch vòng bảng (round-robin): mỗi cặp gặp nhau đúng một lần.
        {courts.length === 1
          ? ' Với 1 sân, mỗi vòng có đúng 1 trận (2 cặp đấu, các cặp còn lại nghỉ).'
          : ` Mỗi vòng tối đa ${courts.length} trận theo số sân.`}
      </p>
      <ul className="mt-3 space-y-1 text-xs text-neutral-600">
        <li>
          <span className="font-medium text-neutral-700">{pairCount}</span> cặp đôi
        </li>
        <li>
          <span className="font-medium text-neutral-700">{courts.length}</span> sân:{' '}
          {courts.map((c) => `Sân ${c}`).join(', ')}
        </li>
      </ul>
      {hasExistingSchedule && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Lịch vòng bảng hiện tại sẽ bị thay thế khi tạo mới.
        </p>
      )}
      <button
        type="button"
        onClick={onGenerate}
        className="mt-4 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
      >
        {hasExistingSchedule ? 'Tạo lại lịch' : 'Tạo lịch'}
      </button>
    </div>
  )
}
