import { useEffect, useMemo, useState } from 'react'
import {
  filterClubPlayers,
  getPlayerAvatarColor,
  getPlayerInitials,
} from '../lib/clubPlayers'
import { formatParticipantName, normalizeParticipantName } from '../lib/showmatchParticipants'

interface PlayerPickerDialogProps {
  open: boolean
  title?: string
  excludedNames?: string[]
  onClose: () => void
  onSelect: (name: string) => void
}

export function PlayerPickerDialog({
  open,
  title = 'Chọn người chơi',
  excludedNames = [],
  onClose,
  onSelect,
}: PlayerPickerDialogProps) {
  const [search, setSearch] = useState('')
  const [manualName, setManualName] = useState('')

  useEffect(() => {
    if (!open) return
    setSearch('')
    setManualName('')
  }, [open])

  const excludedSet = useMemo(
    () => new Set(excludedNames.map((name) => normalizeParticipantName(name))),
    [excludedNames],
  )

  const filteredPlayers = useMemo(() => filterClubPlayers(search), [search])

  if (!open) return null

  const handleSelect = (name: string) => {
    onSelect(formatParticipantName(name))
    onClose()
  }

  const handleManualAdd = () => {
    const trimmed = formatParticipantName(manualName)
    if (!trimmed) return
    handleSelect(trimmed)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl">
        <div className="border-b border-neutral-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
          <p className="mt-1 text-sm text-neutral-500">
            Chọn từ danh sách CLB hoặc thêm tên mới bên dưới.
          </p>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên người chơi..."
            className="mt-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
            autoFocus
          />
        </div>

        <div className="overflow-y-auto px-2 py-2">
          {filteredPlayers.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-neutral-400">
              Không tìm thấy người chơi phù hợp.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {filteredPlayers.map((player) => {
                const isExcluded = excludedSet.has(normalizeParticipantName(player.name))
                return (
                  <li key={player.id}>
                    <button
                      type="button"
                      disabled={isExcluded}
                      onClick={() => handleSelect(player.name)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${getPlayerAvatarColor(player.name)}`}
                      >
                        {getPlayerInitials(player.name)}
                      </div>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900">
                        {player.name}
                      </span>
                      {isExcluded && (
                        <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
                          Đã chọn
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-neutral-100 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Thêm tên khác
          </p>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualAdd()}
              placeholder="Nhập tên người chơi mới"
              className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
            />
            <button
              type="button"
              onClick={handleManualAdd}
              disabled={!manualName.trim()}
              className="shrink-0 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              Thêm
            </button>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
