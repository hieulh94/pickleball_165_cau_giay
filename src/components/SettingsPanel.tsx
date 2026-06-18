import { useMemo, useState } from 'react'
import { MemberGenderBadge } from './MemberEditDialog'
import { SearchInput } from './ui/SearchInput'
import { SectionLabel } from './ui/SectionLabel'
import { Button } from './ui/Button'
import { inputClassName } from './ui/styles'
import { useClubPlayers } from '../hooks/useClubPlayers'
import { useRandomPairSettings } from '../hooks/useRandomPairSettings'
import {
  formatClubPlayerGender,
  getPlayerAvatarColor,
  getPlayerInitials,
} from '../lib/clubPlayers'
import {
  grantSettingsAccess,
  isSettingsAccessGranted,
  verifySettingsPassword,
} from '../lib/settingsAccess'
import { normalizeParticipantName } from '../lib/showmatchParticipants'

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8 text-primary-600" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
    </svg>
  )
}

function SettingsUnlockGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    if (!verifySettingsPassword(password)) {
      setError('Mật khẩu không đúng.')
      return
    }
    grantSettingsAccess()
    onUnlock()
  }

  return (
    <section className="flex justify-center py-8 sm:py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50">
            <LockIcon />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-text-primary">Cài đặt CLB</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Nhập mật khẩu để cấu hình rule random cặp đôi.
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
          Vào cài đặt
        </Button>
      </div>
    </section>
  )
}

function SettingsPanelContent() {
  const { players } = useClubPlayers()
  const { settings, setAvoidFemaleFemalePairs, toggleIncompatible } = useRandomPairSettings()
  const [search, setSearch] = useState('')
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

  const selectedPlayer = players.find((player) => player.id === selectedPlayerId) ?? null

  const blockedSet = useMemo(() => {
    if (!selectedPlayerId) return new Set<string>()
    return new Set(settings.incompatibleWith[selectedPlayerId] ?? [])
  }, [selectedPlayerId, settings.incompatibleWith])

  const filteredPlayers = useMemo(() => {
    const normalized = normalizeParticipantName(search)
    if (!normalized) return players
    return players.filter((player) =>
      normalizeParticipantName(player.name).includes(normalized),
    )
  }, [players, search])

  const otherPlayers = useMemo(() => {
    if (!selectedPlayerId) return []
    const normalized = normalizeParticipantName(search)
    return players.filter((player) => {
      if (player.id === selectedPlayerId) return false
      if (!normalized) return true
      return normalizeParticipantName(player.name).includes(normalized)
    })
  }, [players, selectedPlayerId, search])

  return (
    <section className="space-y-6">
      <div>
        <SectionLabel>Cài đặt CLB</SectionLabel>
        <p className="mt-1 text-sm text-text-secondary">
          Rule random cặp áp dụng khi bấm Random cặp đôi trong mini game.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <h3 className="text-sm font-semibold text-text-primary">Rule random cặp</h3>
        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={settings.avoidFemaleFemalePairs}
            onChange={(e) => setAvoidFemaleFemalePairs(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600/20"
          />
          <span>
            <span className="block text-sm font-medium text-text-primary">
              Không ghép nữ với nữ
            </span>
            <span className="mt-0.5 block text-xs text-text-secondary">
              Khi random, hai người {formatClubPlayerGender('female').toLowerCase()} sẽ không
              được xếp chung một cặp.
            </span>
          </span>
        </label>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <h3 className="text-sm font-semibold text-text-primary">Không random cùng cặp</h3>
        <p className="mt-1 text-xs text-text-secondary">
          Chọn người A, rồi tick B, C, D… — khi random, A sẽ không được ghép chung cặp với những
          người đã tick (và ngược lại).
        </p>

        <div className="mt-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Tìm thành viên..." />
        </div>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Bước 1 · Chọn người A
        </p>
        {filteredPlayers.length === 0 ? (
          <p className="mt-3 text-center text-sm text-text-secondary">Không tìm thấy thành viên.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {filteredPlayers.map((player) => {
              const blockedCount = (settings.incompatibleWith[player.id] ?? []).length
              const active = selectedPlayerId === player.id
              return (
                <li key={player.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedPlayerId(player.id)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                      active
                        ? 'border-primary-400 bg-primary-50 font-semibold text-primary-800'
                        : 'border-border bg-white text-text-primary hover:border-primary-200'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white ${getPlayerAvatarColor(player.name)}`}
                      aria-hidden
                    >
                      {getPlayerInitials(player.name)}
                    </span>
                    {player.name}
                    {blockedCount > 0 && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                        {blockedCount}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {selectedPlayer && (
          <div className="mt-5 rounded-xl border border-primary-100 bg-primary-50/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
              Bước 2 · Không random cùng cặp với
            </p>
            <p className="mt-1 text-sm font-medium text-text-primary">{selectedPlayer.name}</p>

            {otherPlayers.length === 0 ? (
              <p className="mt-3 text-sm text-text-secondary">Không còn thành viên khác.</p>
            ) : (
              <ul className="mt-3 max-h-[min(20rem,40vh)] space-y-2 overflow-y-auto">
                {otherPlayers.map((player) => {
                  const blocked = blockedSet.has(player.id)
                  return (
                    <li key={player.id}>
                      <label
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                          blocked
                            ? 'border-amber-200 bg-amber-50/80'
                            : 'border-border bg-white hover:border-primary-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={blocked}
                          onChange={() => toggleIncompatible(selectedPlayer.id, player.id)}
                          className="h-4 w-4 shrink-0 rounded border-neutral-300 text-primary-600 focus:ring-primary-600/20"
                        />
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${getPlayerAvatarColor(player.name)}`}
                          aria-hidden
                        >
                          {getPlayerInitials(player.name)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
                          {player.name}
                        </span>
                        <MemberGenderBadge gender={player.gender} />
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}

            {blockedSet.size > 0 && (
              <p className="mt-3 text-xs text-text-secondary">
                {selectedPlayer.name} không random cùng cặp với {blockedSet.size} người.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export function SettingsPanel() {
  const [unlocked, setUnlocked] = useState(() => isSettingsAccessGranted())

  if (!unlocked) {
    return <SettingsUnlockGate onUnlock={() => setUnlocked(true)} />
  }

  return <SettingsPanelContent />
}
