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
import type { SkillLevel } from '../types'

interface MemberEditDialogProps {
  open: boolean
  player: ClubPlayer | null
  onClose: () => void
  onSave: (input: {
    name: string
    gender?: ClubPlayerGender
    skillLevel?: SkillLevel
  }) => Promise<string | null> | string | null
}

export function MemberEditDialog({ open, player, onClose, onSave }: MemberEditDialogProps) {
  const [name, setName] = useState('')
  const [gender, setGender] = useState<ClubPlayerGender>('male')
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('B')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !player) return
    setName(player.name)
    setGender(player.gender ?? 'male')
    setSkillLevel(player.skillLevel === 'A' ? 'A' : 'B')
    setError(null)
  }, [open, player])

  if (!open || !player) return null

  const handleSave = async () => {
    setSaving(true)
    const err = await onSave({
      name,
      gender,
      skillLevel,
    })
    setSaving(false)
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
              <p className="text-sm text-neutral-500">
                Tên, giới tính, trình độ
                {player.rating != null ? ` · ${Math.round(player.rating)} Elo` : ''}
              </p>
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
              Hiện tại: {formatClubPlayerGender(gender)} {skillLevel}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Trình độ (A cao hơn B)
            </label>
            <div className="flex gap-2">
              {(['A', 'B'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSkillLevel(level)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${
                    skillLevel === level
                      ? 'border-primary-500 bg-primary-50 text-primary-800'
                      : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {formatClubPlayerGender(gender)} {level}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Có thể tự đổi sau khi đồng bộ Elo từ mini game (≥5 trận).
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
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </Button>
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
