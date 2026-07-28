import { useEffect, useMemo, useRef, useState } from 'react'
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
  getMembersAccessLevel,
  grantMembersAccess,
  verifyMembersPassword,
  type MembersAccessLevel,
} from '../lib/membersAccess'
import {
  ELO_DEMOTE_THRESHOLD,
  ELO_MIN_MATCHES_FOR_SKILL_CHANGE,
  ELO_PROMOTE_THRESHOLD,
  getPlayerEloHistory,
  recomputeClubRatingsFromEvents,
  type EloHistoryEntry,
} from '../lib/playerRating'
import { normalizeParticipantName } from '../lib/showmatchParticipants'
import { subscribeEvents } from '../lib/storage'
import type { PickleballEvent, SkillLevel } from '../types'

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

function MembersUnlockGate({
  onUnlock,
}: {
  onUnlock: (level: MembersAccessLevel) => void
}) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    const level = verifyMembersPassword(password)
    if (!level) {
      setError('Mật khẩu không đúng.')
      return
    }
    grantMembersAccess(level)
    onUnlock(level)
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
            Nhập mật khẩu CLB để quản lý. Nhập <span className="font-semibold text-text-primary">0</span> để
            chỉ xem danh sách và chi tiết Elo (không sửa được).
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
          Vào danh sách
        </Button>
      </div>
    </section>
  )
}

function MembersPanelContent({ canEdit }: { canEdit: boolean }) {
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
  const [events, setEvents] = useState<PickleballEvent[]>([])
  const [eventsReady, setEventsReady] = useState(!isFirebaseConfigured())
  const eloCacheRef = useRef(new Map<string, EloHistoryEntry[]>())

  useEffect(() => {
    if (!isFirebaseConfigured()) return
    return subscribeEvents(
      (data) => {
        setEvents(data)
        setEventsReady(true)
        eloCacheRef.current.clear()
      },
      () => setEventsReady(true),
    )
  }, [])

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
    if (!eventsReady) {
      setSyncMessage('Đang tải dữ liệu event — thử lại sau giây lát.')
      return
    }
    setSyncing(true)
    setSyncMessage(null)
    try {
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

  const resolveEloHistory = (player: ClubPlayer, eventList: PickleballEvent[]) => {
    const cacheKey = normalizeParticipantName(player.name)
    const cached = eloCacheRef.current.get(cacheKey)
    if (cached) return cached
    const history = getPlayerEloHistory(eventList, player.name)
    eloCacheRef.current.set(cacheKey, history)
    return history
  }

  const handleOpenEloHistory = (player: ClubPlayer) => {
    setEloTarget(player)

    if (!isFirebaseConfigured()) {
      setEloHistory([])
      setEloLoading(false)
      return
    }

    if (!eventsReady) {
      setEloHistory([])
      setEloLoading(true)
      return
    }

    // Dùng events đã subscribe sẵn — không fetch Firestore mỗi lần click.
    setEloHistory(resolveEloHistory(player, events))
    setEloLoading(false)
  }

  // Mở Elo trước khi snapshot Firebase về → điền khi sẵn sàng.
  useEffect(() => {
    if (!eloTarget || !eloLoading || !eventsReady || !isFirebaseConfigured()) return
    setEloHistory(resolveEloHistory(eloTarget, events))
    setEloLoading(false)
    // resolveEloHistory đọc ref cache; chỉ phụ thuộc data/target.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [eloTarget, eloLoading, eventsReady, events])

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionLabel>Thành viên CLB</SectionLabel>
          <p className="mt-1 text-sm text-text-secondary">
            {players.length} thành viên · điểm Elo từ mini game · trình độ Nam/Nữ × A–B
            {!canEdit ? ' · chỉ xem (vẫn xem được Elo)' : ''}
          </p>
        </div>
        {canEdit && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleSyncRatings}
            disabled={syncing}
            className="shrink-0"
          >
            {syncing ? 'Đang đồng bộ…' : 'Đồng bộ điểm từ event'}
          </Button>
        )}
      </div>

      <p className="rounded-xl border border-primary-100 bg-primary-50/70 px-3.5 py-2.5 text-sm leading-relaxed text-primary-900/80">
        <span className="font-semibold text-primary-900">Cách tính Elo:</span> cộng/trừ sau mỗi trận
        mini game (không tính showmatch) — thắng đối thủ mạnh được nhiều điểm hơn. Ban đầu A ≈ 1100,
        B ≈ 900. Đủ {ELO_MIN_MATCHES_FOR_SKILL_CHANGE} trận: Elo ≥ {ELO_PROMOTE_THRESHOLD} lên A, ≤{' '}
        {ELO_DEMOTE_THRESHOLD} xuống B.
      </p>

      {syncMessage && (
        <p className="text-sm text-neutral-600">{syncMessage}</p>
      )}

      {canEdit && (
        <>
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
        </>
      )}

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
                {canEdit && (
                  <>
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
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <>
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
        </>
      )}

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
    </section>
  )
}

export function MembersPanel() {
  const [accessLevel, setAccessLevel] = useState<MembersAccessLevel | null>(() =>
    getMembersAccessLevel(),
  )

  if (!accessLevel) {
    return <MembersUnlockGate onUnlock={setAccessLevel} />
  }

  return <MembersPanelContent canEdit={accessLevel === 'edit'} />
}
