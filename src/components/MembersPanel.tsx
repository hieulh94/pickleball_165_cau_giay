import { useMemo, useState } from 'react'
import { ConfirmDialog } from './ConfirmDialog'
import { MemberEditDialog, MemberGenderBadge } from './MemberEditDialog'
import { SearchInput } from './ui/SearchInput'
import { SectionLabel } from './ui/SectionLabel'
import { Button } from './ui/Button'
import { inputClassName, selectClassName } from './ui/styles'
import { useClubPlayers } from '../hooks/useClubPlayers'
import { getPlayerAvatarColor, getPlayerInitials, type ClubPlayerGender } from '../lib/clubPlayers'
import {
  grantMembersAccess,
  isMembersAccessGranted,
  verifyMembersPassword,
} from '../lib/membersAccess'
import { normalizeParticipantName } from '../lib/showmatchParticipants'

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8 text-primary-600" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
    </svg>
  )
}

function MembersUnlockGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    if (!verifyMembersPassword(password)) {
      setError('Mật khẩu không đúng.')
      return
    }
    grantMembersAccess()
    onUnlock()
  }

  return (
    <section className="flex justify-center py-8 sm:py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50">
            <LockIcon />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-text-primary">Danh sách thành viên</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Nhập mật khẩu CLB để xem và quản lý thành viên.
          </p>
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            if (error) setError(null)
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Nhập mật khẩu"
          className={`mt-6 ${inputClassName}`}
          autoFocus
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <Button className="mt-6 w-full" onClick={handleSubmit}>
          Xem danh sách
        </Button>
      </div>
    </section>
  )
}

function MembersPanelContent() {
  const { players, add, update, remove } = useClubPlayers()
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [newGender, setNewGender] = useState<ClubPlayerGender>('male')
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [editTarget, setEditTarget] = useState<(typeof players)[number] | null>(null)

  const filteredPlayers = useMemo(() => {
    const normalized = normalizeParticipantName(search)
    if (!normalized) return players
    return players.filter((player) =>
      normalizeParticipantName(player.name).includes(normalized),
    )
  }, [players, search])

  const handleAdd = () => {
    const err = add(newName, newGender)
    if (err) {
      setError(err)
      return
    }
    setNewName('')
    setNewGender('male')
    setError(null)
  }

  const handleSaveEdit = (input: { name: string; gender?: ClubPlayerGender }) => {
    if (!editTarget) return 'Không tìm thấy thành viên.'
    return update(editTarget.id, input)
  }

  const handleConfirmDelete = () => {
    if (!deleteTarget) return
    remove(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionLabel>Thành viên CLB</SectionLabel>
          <p className="mt-1 text-sm text-text-secondary">
            {players.length} thành viên · dữ liệu lưu tạm trên thiết bị
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <input
          type="text"
          value={newName}
          onChange={(e) => {
            setNewName(e.target.value)
            if (error) setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
          placeholder="Tên thành viên mới..."
          className="h-10 flex-1 rounded-lg border border-neutral-200 px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
        />
        <select
          value={newGender}
          onChange={(e) => setNewGender(e.target.value as ClubPlayerGender)}
          className={`h-10 shrink-0 ${selectClassName}`}
          aria-label="Giới tính"
        >
          <option value="male">Nam</option>
          <option value="female">Nữ</option>
          <option value="other">Khác</option>
        </select>
        <Button onClick={handleAdd} className="shrink-0 sm:w-auto">
          + Thêm
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <SearchInput value={search} onChange={setSearch} placeholder="Tìm thành viên..." />

      {filteredPlayers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-white px-4 py-10 text-center">
          <p className="text-sm text-text-secondary">
            {search.trim() ? 'Không tìm thấy thành viên.' : 'Chưa có thành viên nào.'}
          </p>
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlayers.map((player) => (
            <li
              key={player.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${getPlayerAvatarColor(player.name)}`}
                aria-hidden
              >
                {getPlayerInitials(player.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">{player.name}</p>
                <MemberGenderBadge gender={player.gender} />
              </div>
              <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setEditTarget(player)}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-primary-700 transition hover:bg-primary-50"
                >
                  Sửa
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget({ id: player.id, name: player.name })}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                  aria-label={`Xóa ${player.name}`}
                >
                  Xóa
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <MemberEditDialog
        open={editTarget !== null}
        player={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleSaveEdit}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Xóa thành viên"
        message={`Bạn có chắc muốn xóa "${deleteTarget?.name ?? ''}" khỏi danh sách CLB?`}
        confirmLabel="Xóa"
        confirmVariant="danger"
        cancelLabel="Hủy"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  )
}

export function MembersPanel() {
  const [unlocked, setUnlocked] = useState(() => isMembersAccessGranted())

  if (!unlocked) {
    return <MembersUnlockGate onUnlock={() => setUnlocked(true)} />
  }

  return <MembersPanelContent />
}
