import { useMemo, useState } from 'react'
import { ConfirmDialog } from './ConfirmDialog'
import { EloHistoryDialog } from './EloHistoryDialog'
import { MemberEditDialog, MemberGenderBadge } from './MemberEditDialog'
import { SkillLevelBadge } from './SkillLevelBadge'
import { SearchInput } from './ui/SearchInput'
import { SectionLabel } from './ui/SectionLabel'
import { Button } from './ui/Button'
import { inputClassName, selectClassName } from './ui/styles'
import { useClubPlayers } from '../hooks/useClubPlayers'
import {
  DEFAULT_CLUB_PLAYER_GENDER,
  DEFAULT_CLUB_PLAYER_RATING,
  DEFAULT_CLUB_PLAYER_SKILL_LEVEL,
  getPlayerAvatarColor,
  getPlayerInitials,
  type ClubPlayer,
  type ClubPlayerGender,
} from '../lib/clubPlayers'
import { cn } from '../lib/cn'
import { isFirebaseConfigured } from '../lib/firebase'
import {
  grantMembersAccess,
  isMembersAccessGranted,
  verifyMembersPassword,
} from '../lib/membersAccess'
import {
  getPlayerEloHistory,
  recomputeClubRatingsFromEvents,
  type EloHistoryEntry,
} from '../lib/playerRating'
import { normalizeParticipantName } from '../lib/showmatchParticipants'
import { fetchAllEvents } from '../lib/storage'
import type { SkillLevel } from '../types'

type GenderFilter = 'all' | ClubPlayerGender

const GENDER_FILTER_OPTIONS: { value: GenderFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
]

function resolvePlayerGender(gender?: ClubPlayerGender): ClubPlayerGender {
  return gender ?? DEFAULT_CLUB_PLAYER_GENDER
}

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
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all')
  const [newName, setNewName] = useState('')
  const [newGender, setNewGender] = useState<ClubPlayerGender>('male')
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [editTarget, setEditTarget] = useState<(typeof players)[number] | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [eloTarget, setEloTarget] = useState<ClubPlayer | null>(null)
  const [eloHistory, setEloHistory] = useState<EloHistoryEntry[]>([])
  const [eloLoading, setEloLoading] = useState(false)

  const filteredPlayers = useMemo(() => {
    const normalized = normalizeParticipantName(search)
    return players.filter((player) => {
      if (genderFilter !== 'all' && resolvePlayerGender(player.gender) !== genderFilter) {
        return false
      }
      if (!normalized) return true
      return normalizeParticipantName(player.name).includes(normalized)
    })
  }, [players, search, genderFilter])

  const hasActiveFilter = search.trim().length > 0 || genderFilter !== 'all'

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

  const handleSaveEdit = async (input: {
    name: string
    gender?: ClubPlayerGender
    skillLevel?: SkillLevel
  }) => {
    if (!editTarget) return 'Không tìm thấy thành viên.'
    return update(editTarget.id, input)
  }

  const handleConfirmDelete = () => {
    if (!deleteTarget) return
    remove(deleteTarget.id)
    setDeleteTarget(null)
  }

  const handleSyncRatings = async () => {
    if (!isFirebaseConfigured()) {
      setSyncMessage('Chưa cấu hình Firebase — không tải được lịch sử event.')
      return
    }
    setSyncing(true)
    setSyncMessage(null)
    try {
      const events = await fetchAllEvents()
      const { updated, rows } = recomputeClubRatingsFromEvents(events)
      setSyncMessage(
        updated > 0
          ? `Đã cập nhật ${updated} thành viên từ ${rows.filter((r) => r.matchesRated > 0).length} người có trận mini game.`
          : rows.some((r) => r.matchesRated > 0)
            ? 'Điểm đã đồng bộ — không có thay đổi mới.'
            : 'Chưa có trận mini game hoàn thành để tính điểm.',
      )
    } catch (err) {
      console.error(err)
      setSyncMessage('Không đồng bộ được. Kiểm tra mạng và thử lại.')
    } finally {
      setSyncing(false)
    }
  }

  const handleOpenEloHistory = async (player: ClubPlayer) => {
    if (!isFirebaseConfigured()) {
      setEloTarget(player)
      setEloHistory([])
      return
    }
    setEloTarget(player)
    setEloLoading(true)
    try {
      const events = await fetchAllEvents()
      setEloHistory(getPlayerEloHistory(events, player.name))
    } catch (err) {
      console.error(err)
      setEloHistory([])
    } finally {
      setEloLoading(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionLabel>Thành viên CLB</SectionLabel>
          <p className="mt-1 text-sm text-text-secondary">
            {players.length} thành viên · điểm Elo từ mini game · trình độ Nam/Nữ × A–B
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={handleSyncRatings}
          disabled={syncing}
          className="shrink-0"
        >
          {syncing ? 'Đang đồng bộ…' : 'Đồng bộ điểm từ event'}
        </Button>
      </div>
      {syncMessage && (
        <p className="text-sm text-neutral-600">{syncMessage}</p>
      )}

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

      <div className="flex flex-wrap gap-2">
        {GENDER_FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setGenderFilter(option.value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
              genderFilter === option.value
                ? option.value === 'male'
                  ? 'border-sky-400 bg-sky-100 text-sky-800'
                  : option.value === 'female'
                    ? 'border-rose-400 bg-rose-100 text-rose-800'
                    : option.value === 'other'
                      ? 'border-neutral-400 bg-neutral-100 text-neutral-700'
                      : 'border-primary-500 bg-primary-100 text-primary-800'
                : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {filteredPlayers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-white px-4 py-10 text-center">
          <p className="text-sm text-text-secondary">
            {hasActiveFilter ? 'Không tìm thấy thành viên.' : 'Chưa có thành viên nào.'}
          </p>
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 landscape-short:grid-cols-3 lg:grid-cols-3">
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
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <MemberGenderBadge gender={player.gender} />
                  <SkillLevelBadge
                    level={player.skillLevel ?? DEFAULT_CLUB_PLAYER_SKILL_LEVEL}
                    gender={player.gender ?? DEFAULT_CLUB_PLAYER_GENDER}
                  />
                  <button
                    type="button"
                    onClick={() => handleOpenEloHistory(player)}
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-primary-700 transition hover:bg-primary-50"
                    title="Xem chi tiết cộng trừ Elo"
                  >
                    {player.rating ?? DEFAULT_CLUB_PLAYER_RATING} Elo
                    {(player.matchesRated ?? 0) > 0
                      ? ` · ${player.matchesRated} trận`
                      : ''}
                  </button>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                <button
                  type="button"
                  onClick={() => handleOpenEloHistory(player)}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50"
                >
                  Elo
                </button>
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

      <EloHistoryDialog
        open={eloTarget !== null}
        playerName={eloTarget?.name ?? ''}
        rating={eloTarget?.rating ?? DEFAULT_CLUB_PLAYER_RATING}
        skillLevel={eloTarget?.skillLevel}
        history={eloHistory}
        loading={eloLoading}
        onClose={() => {
          setEloTarget(null)
          setEloHistory([])
        }}
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
