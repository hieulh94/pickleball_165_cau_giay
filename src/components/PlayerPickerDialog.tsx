import { useEffect, useMemo, useState } from 'react'
import {
  filterClubPlayers,
  getPlayerAvatarColor,
  getPlayerInitials,
} from '../lib/clubPlayers'
import { formatParticipantName, normalizeParticipantName } from '../lib/showmatchParticipants'
import { cn } from '../lib/cn'
import { getSkillLevelToggleClass } from '../lib/skillLevelStyles'
import type { SkillLevel } from '../types'

interface PlayerPickerDialogBaseProps {
  open: boolean
  title?: string
  excludedNames?: string[]
  onClose: () => void
}

interface PlayerPickerDialogSingleProps extends PlayerPickerDialogBaseProps {
  multiple?: false
  onSelect: (name: string) => void
}

interface PlayerPickerDialogMultiProps extends PlayerPickerDialogBaseProps {
  multiple: true
  skillLevel: SkillLevel
  onSkillLevelChange: (level: SkillLevel) => void
  onSelectMany: (names: string[]) => void
}

type PlayerPickerDialogProps = PlayerPickerDialogSingleProps | PlayerPickerDialogMultiProps

export function PlayerPickerDialog(props: PlayerPickerDialogProps) {
  const {
    open,
    title = 'Chọn người chơi',
    excludedNames = [],
    onClose,
    multiple = false,
  } = props

  const [search, setSearch] = useState('')
  const [manualName, setManualName] = useState('')
  const [selectedNames, setSelectedNames] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setSearch('')
    setManualName('')
    setSelectedNames([])
  }, [open])

  const excludedSet = useMemo(
    () => new Set(excludedNames.map((name) => normalizeParticipantName(name))),
    [excludedNames],
  )

  const selectedSet = useMemo(
    () => new Set(selectedNames.map((name) => normalizeParticipantName(name))),
    [selectedNames],
  )

  const filteredPlayers = useMemo(() => filterClubPlayers(search), [search])

  if (!open) return null

  const handleSingleSelect = (name: string) => {
    if (!multiple && 'onSelect' in props) {
      props.onSelect(formatParticipantName(name))
      onClose()
    }
  }

  const toggleSelection = (name: string) => {
    const formatted = formatParticipantName(name)
    const key = normalizeParticipantName(formatted)
    if (excludedSet.has(key)) return

    setSelectedNames((prev) => {
      const prevKeys = prev.map((n) => normalizeParticipantName(n))
      if (prevKeys.includes(key)) {
        return prev.filter((n) => normalizeParticipantName(n) !== key)
      }
      return [...prev, formatted]
    })
  }

  const addManualToSelection = () => {
    const trimmed = formatParticipantName(manualName)
    if (!trimmed) return
    const key = normalizeParticipantName(trimmed)
    if (excludedSet.has(key)) return
    if (selectedSet.has(key)) {
      setManualName('')
      return
    }
    setSelectedNames((prev) => [...prev, trimmed])
    setManualName('')
  }

  const handleManualAdd = () => {
    if (multiple) {
      addManualToSelection()
      return
    }
    const trimmed = formatParticipantName(manualName)
    if (!trimmed) return
    handleSingleSelect(trimmed)
  }

  const handleConfirmMany = () => {
    if (!multiple || !('onSelectMany' in props)) return
    if (selectedNames.length === 0) return
    props.onSelectMany(selectedNames)
    onClose()
  }

  const skillLevel = multiple && 'skillLevel' in props ? props.skillLevel : 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl">
        <div className="border-b border-neutral-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
          <p className="mt-1 text-sm text-neutral-500">
            {multiple
              ? 'Chọn nhiều người từ danh sách CLB, gán trình độ rồi thêm vào event.'
              : 'Chọn từ danh sách CLB hoặc thêm tên mới bên dưới.'}
          </p>

          {multiple && 'onSkillLevelChange' in props && (
            <div className="mt-3">
              <p className="text-sm font-medium text-neutral-700">Trình độ</p>
              <div className="mt-1.5 flex gap-2">
                {([1, 2] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => props.onSkillLevelChange(level)}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors',
                      getSkillLevelToggleClass(level, skillLevel === level),
                    )}
                  >
                    Trình độ {level}
                  </button>
                ))}
              </div>
            </div>
          )}

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên người chơi..."
            className="mt-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
            autoFocus
          />
        </div>

        {multiple && selectedNames.length > 0 && (
          <div className="border-b border-neutral-100 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Đã chọn ({selectedNames.length})
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleSelection(name)}
                  className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-800 hover:bg-primary-100"
                  title="Bỏ chọn"
                >
                  {name}
                  <span aria-hidden>×</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-y-auto px-2 py-2">
          {filteredPlayers.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-neutral-400">
              Không tìm thấy người chơi phù hợp.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {filteredPlayers.map((player) => {
                const isExcluded = excludedSet.has(normalizeParticipantName(player.name))
                const isSelected = selectedSet.has(normalizeParticipantName(player.name))

                return (
                  <li key={player.id}>
                    <button
                      type="button"
                      disabled={isExcluded}
                      onClick={() =>
                        multiple ? toggleSelection(player.name) : handleSingleSelect(player.name)
                      }
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50',
                        multiple && isSelected
                          ? 'bg-primary-50 ring-1 ring-primary-200'
                          : 'hover:bg-neutral-50',
                      )}
                    >
                      {multiple && (
                        <span
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold',
                            isSelected
                              ? 'border-primary-600 bg-primary-600 text-white'
                              : 'border-neutral-300 bg-white text-transparent',
                          )}
                          aria-hidden
                        >
                          ✓
                        </span>
                      )}
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${getPlayerAvatarColor(player.name)}`}
                      >
                        {getPlayerInitials(player.name)}
                      </div>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900">
                        {player.name}
                      </span>
                      {isExcluded ? (
                        <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
                          Đã có
                        </span>
                      ) : multiple && isSelected ? (
                        <span className="shrink-0 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                          Đã chọn
                        </span>
                      ) : null}
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
              {multiple ? 'Chọn' : 'Thêm'}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Đóng
            </button>
            {multiple && (
              <button
                type="button"
                onClick={handleConfirmMany}
                disabled={selectedNames.length === 0}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                Thêm {selectedNames.length > 0 ? `${selectedNames.length} người` : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
