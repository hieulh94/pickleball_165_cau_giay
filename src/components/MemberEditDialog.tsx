import { useEffect, useState } from 'react'
import { Button } from './ui/Button'
import { inputClassName, selectClassName } from './ui/styles'
import {
  formatClubPlayerGender,
  getPlayerAvatarColor,
  getPlayerInitials,
  type ClubPlayer,
  type ClubPlayerGender,
} from '../lib/clubPlayers'

interface MemberEditDialogProps {
  open: boolean
  player: ClubPlayer | null
  onClose: () => void
  onSave: (input: { name: string; gender?: ClubPlayerGender }) => string | null
}

export function MemberEditDialog({ open, player, onClose, onSave }: MemberEditDialogProps) {
  const [name, setName] = useState('')
  const [gender, setGender] = useState<ClubPlayerGender>('male')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !player) return
    setName(player.name)
    setGender(player.gender ?? 'male')
    setError(null)
  }, [open, player])

  if (!open || !player) return null

  const handleSave = () => {
    const err = onSave({
      name,
      gender,
    })
    if (err) {
      setError(err)
      return
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="border-b border-neutral-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${getPlayerAvatarColor(player.name)}`}
              aria-hidden
            >
              {getPlayerInitials(player.name)}
            </span>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">Sửa thành viên</h3>
              <p className="text-sm text-neutral-500">Cập nhật tên và giới tính</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label htmlFor="member-edit-name" className="mb-1 block text-sm font-medium text-neutral-700">
              Tên
            </label>
            <input
              id="member-edit-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError(null)
              }}
              className={inputClassName}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="member-edit-gender" className="mb-1 block text-sm font-medium text-neutral-700">
              Giới tính
            </label>
            <select
              id="member-edit-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value as ClubPlayerGender)}
              className={`w-full ${selectClassName}`}
            >
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
            </select>
            <p className="mt-1 text-xs text-neutral-500">
              Hiện tại: {formatClubPlayerGender(gender)}
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Hủy
          </button>
          <Button onClick={handleSave}>Lưu</Button>
        </div>
      </div>
    </div>
  )
}

function genderBadgeClass(gender?: ClubPlayerGender): string {
  switch (gender) {
    case 'male':
      return 'bg-sky-50 text-sky-700'
    case 'female':
      return 'bg-rose-50 text-rose-700'
    case 'other':
      return 'bg-neutral-100 text-neutral-600'
    default:
      return 'bg-neutral-50 text-neutral-400'
  }
}

export function MemberGenderBadge({ gender }: { gender?: ClubPlayerGender }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${genderBadgeClass(gender)}`}
    >
      {formatClubPlayerGender(gender)}
    </span>
  )
}
