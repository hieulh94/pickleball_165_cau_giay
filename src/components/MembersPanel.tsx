import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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
  formatSkillChangeLabel,
  getPlayerEloHistory,
  getSkillRankChanges,
  recomputeClubRatingsFromEvents,
  type EloHistoryEntry,
  type SkillChangeEvent,
} from '../lib/playerRating'
import { normalizeParticipantName } from '../lib/showmatchParticipants'
import { subscribeEvents } from '../lib/storage'
import type { PickleballEvent, SkillLevel } from '../types'

type GenderFilter = 'all' | ClubPlayerGender
type MembersListTab = 'members' | 'promotions'
type SkillFilter = 'all' | SkillLevel
type EloFilter = 'all' | 'high' | 'mid' | 'low'
type MatchesFilter = 'all' | 'played' | 'none' | '10+' | '20+'
type MemberSort = 'name' | 'elo-desc' | 'elo-asc' | 'matches-desc' | 'matches-asc'

const GENDER_FILTER_OPTIONS: { value: GenderFilter; label: string }[] = [
  { value: 'all', label: 'Giới tính' },
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
]

const SKILL_FILTER_OPTIONS: { value: SkillFilter; label: string }[] = [
  { value: 'all', label: 'Hạng' },
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
]

const ELO_FILTER_OPTIONS: { value: EloFilter; label: string }[] = [
  { value: 'all', label: 'Elo' },
  { value: 'high', label: `≥ ${ELO_PROMOTE_THRESHOLD}` },
  { value: 'mid', label: `${ELO_DEMOTE_THRESHOLD}–${ELO_PROMOTE_THRESHOLD - 1}` },
  { value: 'low', label: `< ${ELO_DEMOTE_THRESHOLD}` },
]

const MATCHES_FILTER_OPTIONS: { value: MatchesFilter; label: string }[] = [
  { value: 'all', label: 'Trận' },
  { value: 'played', label: 'Đã chơi' },
  { value: 'none', label: 'Chưa chơi' },
  { value: '10+', label: '≥ 10' },
  { value: '20+', label: '≥ 20' },
]

const SORT_OPTIONS: { value: MemberSort; label: string }[] = [
  { value: 'name', label: 'Tên A–Z' },
  { value: 'elo-desc', label: 'Elo ↓' },
  { value: 'elo-asc', label: 'Elo ↑' },
  { value: 'matches-desc', label: 'Trận ↓' },
  { value: 'matches-asc', label: 'Trận ↑' },
]

function resolvePlayerGender(gender?: ClubPlayerGender): ClubPlayerGender {
  return gender ?? DEFAULT_CLUB_PLAYER_GENDER
}

function playerElo(player: ClubPlayer): number {
  return player.rating ?? DEFAULT_CLUB_PLAYER_RATING
}

function playerMatches(player: ClubPlayer): number {
  return player.matchesRated ?? 0
}

function playerSkill(player: ClubPlayer): SkillLevel {
  return player.skillLevel ?? DEFAULT_CLUB_PLAYER_SKILL_LEVEL
}

const filterSelectClassName = `h-9 w-full ${selectClassName} py-1.5 text-xs`

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
  const [skillFilter, setSkillFilter] = useState<SkillFilter>('all')
  const [eloFilter, setEloFilter] = useState<EloFilter>('all')
  const [matchesFilter, setMatchesFilter] = useState<MatchesFilter>('all')
  const [sortBy, setSortBy] = useState<MemberSort>('name')
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
  const [listTab, setListTab] = useState<MembersListTab>('members')
  const [rankChanges, setRankChanges] = useState<SkillChangeEvent[]>([])
  const [rankChangesLoading, setRankChangesLoading] = useState(false)
  const [rankChangesReady, setRankChangesReady] = useState(false)
  const eloCacheRef = useRef(new Map<string, EloHistoryEntry[]>())
  const eloRequestIdRef = useRef(0)

  useEffect(() => {
    if (!isFirebaseConfigured()) return
    return subscribeEvents(
      (data) => {
        setEvents(data)
        setEventsReady(true)
        eloCacheRef.current.clear()
        setRankChangesReady(false)
      },
      () => setEventsReady(true),
    )
  }, [])

  useEffect(() => {
    if (listTab !== 'promotions') return
    if (!isFirebaseConfigured()) {
      setRankChanges([])
      setRankChangesReady(true)
      setRankChangesLoading(false)
      return
    }
    if (rankChangesReady) return
    if (!eventsReady) {
      setRankChangesLoading(true)
      return
    }

    setRankChangesLoading(true)
    const eventList = events
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        setRankChanges(getSkillRankChanges(eventList))
        setRankChangesReady(true)
        setRankChangesLoading(false)
      }, 0)
    })
  }, [listTab, rankChangesReady, eventsReady, events])

  const filteredPlayers = useMemo(() => {
    const normalized = normalizeParticipantName(search)
    const filtered = players.filter((player) => {
      if (genderFilter !== 'all' && resolvePlayerGender(player.gender) !== genderFilter) {
        return false
      }
      if (skillFilter !== 'all' && playerSkill(player) !== skillFilter) {
        return false
      }

      const elo = playerElo(player)
      if (eloFilter === 'high' && elo < ELO_PROMOTE_THRESHOLD) return false
      if (eloFilter === 'mid' && (elo < ELO_DEMOTE_THRESHOLD || elo >= ELO_PROMOTE_THRESHOLD)) {
        return false
      }
      if (eloFilter === 'low' && elo >= ELO_DEMOTE_THRESHOLD) return false

      const matches = playerMatches(player)
      if (matchesFilter === 'played' && matches === 0) return false
      if (matchesFilter === 'none' && matches > 0) return false
      if (matchesFilter === '10+' && matches < 10) return false
      if (matchesFilter === '20+' && matches < 20) return false

      if (!normalized) return true
      return normalizeParticipantName(player.name).includes(normalized)
    })

    return filtered.slice().sort((a, b) => {
      switch (sortBy) {
        case 'elo-desc':
          return playerElo(b) - playerElo(a) || a.name.localeCompare(b.name, 'vi')
        case 'elo-asc':
          return playerElo(a) - playerElo(b) || a.name.localeCompare(b.name, 'vi')
        case 'matches-desc':
          return playerMatches(b) - playerMatches(a) || a.name.localeCompare(b.name, 'vi')
        case 'matches-asc':
          return playerMatches(a) - playerMatches(b) || a.name.localeCompare(b.name, 'vi')
        case 'name':
        default:
          return a.name.localeCompare(b.name, 'vi')
      }
    })
  }, [players, search, genderFilter, skillFilter, eloFilter, matchesFilter, sortBy])

  const hasActiveFilter =
    search.trim().length > 0 ||
    genderFilter !== 'all' ||
    skillFilter !== 'all' ||
    eloFilter !== 'all' ||
    matchesFilter !== 'all' ||
    sortBy !== 'name'

  const resetFilters = () => {
    setSearch('')
    setGenderFilter('all')
    setSkillFilter('all')
    setEloFilter('all')
    setMatchesFilter('all')
    setSortBy('name')
  }

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
    const requestId = ++eloRequestIdRef.current
    setEloTarget(player)

    if (!isFirebaseConfigured()) {
      setEloHistory([])
      setEloLoading(false)
      return
    }

    const cacheKey = normalizeParticipantName(player.name)
    const cached = eloCacheRef.current.get(cacheKey)
    if (cached && eventsReady) {
      setEloHistory(cached)
      setEloLoading(false)
      return
    }

    // Mở dialog + loading ngay; tính Elo sau khi UI kịp vẽ.
    setEloHistory([])
    setEloLoading(true)

    if (!eventsReady) return

    const eventList = events
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        if (eloRequestIdRef.current !== requestId) return
        setEloHistory(resolveEloHistory(player, eventList))
        setEloLoading(false)
      }, 0)
    })
  }

  const openEloForPromotion = (change: SkillChangeEvent) => {
    const player =
      players.find((p) => p.id === change.clubPlayerId) ??
      players.find(
        (p) => normalizeParticipantName(p.name) === normalizeParticipantName(change.playerName),
      )
    if (player) {
      handleOpenEloHistory(player)
      return
    }
    handleOpenEloHistory({
      id: change.clubPlayerId ?? change.playerName,
      name: change.playerName,
      skillLevel: change.to,
      rating: change.ratingAfter,
      matchesRated: 0,
    })
  }

  // Mở Elo trước khi snapshot Firebase về → điền khi sẵn sàng.
  useEffect(() => {
    if (!eloTarget || !eloLoading || !eventsReady || !isFirebaseConfigured()) return
    const requestId = eloRequestIdRef.current
    const player = eloTarget
    const eventList = events
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        if (eloRequestIdRef.current !== requestId) return
        setEloHistory(resolveEloHistory(player, eventList))
        setEloLoading(false)
      }, 0)
    })
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

      <div className="flex gap-1 rounded-xl border border-border bg-neutral-50 p-1">
        {(
          [
            { id: 'members' as const, label: 'Danh sách' },
            { id: 'promotions' as const, label: 'Đổi hạng' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setListTab(tab.id)}
            className={cn(
              'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition',
              listTab === tab.id
                ? 'bg-white text-primary-800 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900',
            )}
          >
            {tab.label}
            {tab.id === 'promotions' && rankChangesReady && rankChanges.length > 0
              ? ` (${rankChanges.length})`
              : ''}
          </button>
        ))}
      </div>

      {listTab === 'members' ? (
        <>
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

          <div className="space-y-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Tìm thành viên..." />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as GenderFilter)}
                className={filterSelectClassName}
                aria-label="Lọc giới tính"
              >
                {GENDER_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value as SkillFilter)}
                className={filterSelectClassName}
                aria-label="Lọc hạng"
              >
                {SKILL_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={eloFilter}
                onChange={(e) => setEloFilter(e.target.value as EloFilter)}
                className={filterSelectClassName}
                aria-label="Lọc Elo"
              >
                {ELO_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={matchesFilter}
                onChange={(e) => setMatchesFilter(e.target.value as MatchesFilter)}
                className={filterSelectClassName}
                aria-label="Lọc số trận"
              >
                {MATCHES_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as MemberSort)}
                className={cn(filterSelectClassName, 'col-span-2 sm:col-span-1')}
                aria-label="Sắp xếp"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-neutral-500">
              <span>
                <span className="font-semibold text-neutral-700">{filteredPlayers.length}</span>/
                {players.length} thành viên
              </span>
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="font-medium text-primary-700 hover:underline"
                >
                  Xóa lọc
                </button>
              )}
            </div>
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
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Lịch sử thăng hạng B → A (Elo ≥ {ELO_PROMOTE_THRESHOLD}) và xuống hạng A → B (Elo ≤{' '}
            {ELO_DEMOTE_THRESHOLD}), sau đủ {ELO_MIN_MATCHES_FOR_SKILL_CHANGE} trận mini game.
          </p>

          {rankChangesLoading || (!rankChangesReady && !eventsReady) ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-4 py-10">
              <span
                className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600"
                aria-hidden
              />
              <p className="text-sm text-neutral-500">Đang tải lịch sử đổi hạng…</p>
            </div>
          ) : rankChanges.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 bg-white px-4 py-10 text-center">
              <p className="text-sm text-text-secondary">Chưa có lần đổi hạng A ↔ B nào.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {rankChanges.map((change) => {
                const promoted = change.from === 'B' && change.to === 'A'
                return (
                  <li
                    key={`${change.matchId}-${change.eventId}-${change.playerName}-${change.from}-${change.to}`}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-3',
                      promoted
                        ? 'border-amber-200 bg-amber-50/60'
                        : 'border-sky-200 bg-sky-50/60',
                    )}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${getPlayerAvatarColor(change.playerName)}`}
                      aria-hidden
                    >
                      {getPlayerInitials(change.playerName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {change.playerName}
                      </p>
                      <p
                        className={cn(
                          'mt-0.5 text-xs font-medium',
                          promoted ? 'text-amber-800' : 'text-sky-800',
                        )}
                      >
                        {formatSkillChangeLabel(change.from, change.to)} · {change.ratingAfter} Elo
                      </p>
                      <Link
                        to={`/event/${change.eventId}`}
                        className="mt-0.5 block truncate text-xs font-medium text-primary-600 hover:underline"
                      >
                        {change.eventName}
                      </Link>
                      <p className="mt-0.5 text-[11px] tabular-nums text-neutral-500">
                        {new Date(change.eventDate).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                        {' · '}
                        Vòng {change.round}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
                        promoted
                          ? 'bg-amber-200/80 text-amber-900'
                          : 'bg-sky-200/80 text-sky-900',
                      )}
                    >
                      {change.from}→{change.to}
                    </span>
                    <button
                      type="button"
                      onClick={() => openEloForPromotion(change)}
                      className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-neutral-600 transition hover:bg-white/80"
                    >
                      Elo
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
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
