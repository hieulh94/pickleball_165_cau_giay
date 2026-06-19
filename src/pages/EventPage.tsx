import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ContributionDialog } from '../components/ContributionDialog'
import { EventCodeDialog } from '../components/EventCodeDialog'
import { RandomPairWheelOverlay } from '../components/RandomPairWheelOverlay'
import { FirebaseSetupNotice } from '../components/FirebaseSetupNotice'
import { ManualSchedulePanel } from '../components/ManualSchedulePanel'
import { PlayoffSection } from '../components/PlayoffSection'
import { PlayerNameInput } from '../components/PlayerNameInput'
import { PlayerPickerDialog } from '../components/PlayerPickerDialog'
import { SkillLevelBadge } from '../components/SkillLevelBadge'
import { PairGroupSelect } from '../components/PairGroupSelect'
import { ResultDialog } from '../components/ResultDialog'
import {
  allPairsAssignedToGroups,
  applyGroupsToPairs,
  MAX_GROUP_COUNT,
  MIN_GROUP_COUNT,
  randomAssignGroups,
  resolveGroupCount,
  UNASSIGNED_GROUP_LABEL,
} from '../lib/groups'
import { filterGroupMatches, filterPlayoffMatches, isGroupMatch } from '../lib/matches'
import { getPairLabel, randomPairs } from '../lib/pairing'
import {
  areParticipantsIncompatible,
  getParticipantGender,
} from '../lib/participantGender'
import { getRandomPairSettings } from '../lib/randomPairSettings'
import { attachClubPlayerId, participantFromClubSelection } from '../lib/clubPlayerSync'
import {
  applySetupLock,
  applySetupUnlock,
  getSetupLockBlockReason,
  getSetupLockConfirmMessage,
  isSetupLocked,
  verifySetupLockPassword,
  type SetupLockKey,
} from '../lib/setupLocks'
import { getPairColor, pairCardClassName } from '../lib/pairColors'
import { generateSchedule } from '../lib/schedule'
import {
  eventRequiresPassword,
  grantEventAccess,
  isEventAccessGranted,
} from '../lib/eventAccess'
import { isFirebaseConfigured } from '../lib/firebase'
import { deleteEvent, subscribeEvent, upsertEvent } from '../lib/storage'
import { calculateStandings, hasCompletedMatches } from '../lib/standings'
import {
  CollapsibleSection,
  DEFAULT_SECTION_VISIBILITY,
  type SectionKey,
} from '../components/CollapsibleSection'
import { SectionNavBar } from '../components/SectionNavBar'
import { StandingsContent } from '../components/StandingsSection'
import { SectionLockButton } from '../components/SectionLockButton'
import { ShowMatchEventPage } from './ShowMatchEventPage'
import { Button } from '../components/ui/Button'
import { BackLink } from '../components/ui/BackLink'
import { CompactEventHeader } from '../components/ui/CompactEventHeader'
import type { Match, Pair, Participant, PickleballEvent, SkillLevel } from '../types'

function isManualPair(pair: Pair) {
  return pair.isManual === true || (pair.isManual === undefined && pair.locked === true)
}

function PairTypeBadge({ pair }: { pair: Pair }) {
  if (isManualPair(pair)) {
    return (
      <span className="inline-flex items-center rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
        ✋ Ghép tay
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
      🎲 Random
    </span>
  )
}

function getPairNameLines(pair: Pair, participants: Participant[]) {
  const p1 = participants.find((p) => p.id === pair.player1Id)
  const p2 = participants.find((p) => p.id === pair.player2Id)
  if (!p1 || !p2) return { line1: '—', line2: '' }
  return { line1: p1.name, line2: p2.name }
}

function getPairShortLabel(pair: Pair, participants: Participant[]) {
  const p1 = participants.find((p) => p.id === pair.player1Id)
  const p2 = participants.find((p) => p.id === pair.player2Id)
  if (!p1 || !p2) return '—'
  return `${p1.name} & ${p2.name}`
}

function PairDisplayCard({
  pair,
  pairNumber,
  participants,
}: {
  pair: Pair | undefined
  pairNumber: number
  participants: Participant[]
}) {
  if (!pair || pairNumber < 1) {
    return (
      <div className="flex h-full min-h-[5.5rem] w-full items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50 text-sm text-neutral-400">
        —
      </div>
    )
  }

  const color = getPairColor(pairNumber)
  const { line1, line2 } = getPairNameLines(pair, participants)

  return (
    <div
      className={`flex h-full min-h-[5.5rem] w-full flex-col items-center justify-center border-2 text-center ${color.border} ${color.bg} rounded-xl px-2 py-3 shadow-sm`}
    >
      <p className={`text-sm font-bold ${color.text}`}>Cặp {pairNumber}</p>
      <p className={`mt-1 w-full break-words text-xs font-semibold leading-tight ${color.text}`}>
        {line1}
      </p>
      <p className={`text-[10px] font-medium ${color.text} opacity-70`}>&</p>
      <p className={`w-full break-words text-xs font-semibold leading-tight ${color.text}`}>
        {line2}
      </p>
      <div className="mt-2">
        <PairTypeBadge pair={pair} />
      </div>
    </div>
  )
}

export function EventPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [event, setEvent] = useState<PickleballEvent | null>(null)
  const [loading, setLoading] = useState(isFirebaseConfigured())
  const [error, setError] = useState<string | null>(null)
  const [participantPickerOpen, setParticipantPickerOpen] = useState(false)
  const [contributionDialogOpen, setContributionDialogOpen] = useState(false)
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(1)
  const [courtInput, setCourtInput] = useState('')
  const [manualPlayer1Name, setManualPlayer1Name] = useState('')
  const [manualPlayer2Name, setManualPlayer2Name] = useState('')
  const [manualPairGroup, setManualPairGroup] = useState<string | undefined>(undefined)
  const [isEditingEventName, setIsEditingEventName] = useState(false)
  const [eventNameInput, setEventNameInput] = useState('')
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [participantToDelete, setParticipantToDelete] = useState<string | null>(null)
  const [matchToDelete, setMatchToDelete] = useState<string | null>(null)
  const [showRandomPairsConfirm, setShowRandomPairsConfirm] = useState(false)
  const [randomWheelSession, setRandomWheelSession] = useState<{
    wheelLabels: string[]
    pairLabels: string[]
  } | null>(null)
  const pendingRandomApplyRef = useRef<(() => void) | null>(null)
  const [showCreateScheduleConfirm, setShowCreateScheduleConfirm] = useState(false)
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
  const [scheduleCreateMode, setScheduleCreateMode] = useState<'manual' | null>(null)
  const [collapsedRounds, setCollapsedRounds] = useState<Set<number>>(() => new Set())
  const [showGroupCountDialog, setShowGroupCountDialog] = useState(false)
  const [showEnableSplitGroupsConfirm, setShowEnableSplitGroupsConfirm] = useState(false)
  const [showRandomizeGroupsConfirm, setShowRandomizeGroupsConfirm] = useState(false)
  const [groupCountInput, setGroupCountInput] = useState('2')
  const [groupCountError, setGroupCountError] = useState<string | null>(null)
  const [sectionVisibility, setSectionVisibility] = useState(DEFAULT_SECTION_VISIBILITY)
  const [accessGranted, setAccessGranted] = useState(() =>
    id ? isEventAccessGranted(id) : false,
  )
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [setupLockConfirm, setSetupLockConfirm] = useState<{
    key: SetupLockKey
    action: 'lock' | 'unlock'
  } | null>(null)
  const [setupLockPassword, setSetupLockPassword] = useState('')
  const [setupLockPasswordError, setSetupLockPasswordError] = useState<string | null>(null)

  const setSectionVisible = (key: SectionKey, visible: boolean) => {
    setSectionVisibility((prev) => ({ ...prev, [key]: visible }))
  }

  const showAllSections = () => {
    setSectionVisibility({ ...DEFAULT_SECTION_VISIBILITY })
  }

  const hideAllSections = () => {
    setSectionVisibility({
      participants: false,
      pairs: false,
      schedule: false,
      standings: false,
      playoffs: false,
      contribution: false,
    })
  }

  const handleRequestDeleteEvent = () => {
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDeleteEvent = async () => {
    if (!event) return
    setDeleteConfirmOpen(false)
    try {
      await deleteEvent(event.id)
      navigate('/')
    } catch {
      alert('Không thể xóa event. Kiểm tra kết nối và quyền Firestore.')
    }
  }

  useEffect(() => {
    if (!id || !isFirebaseConfigured()) {
      setLoading(false)
      return
    }

    const unsubscribe = subscribeEvent(
      id,
      (data) => {
        setEvent(data)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [id])

  useEffect(() => {
    if (!id || !event) return

    if (!eventRequiresPassword(event.accessPassword)) {
      setAccessGranted(true)
      return
    }

    setAccessGranted(isEventAccessGranted(id))
  }, [id, event])

  const finishRandomWheel = useCallback(() => {
    setRandomWheelSession(null)
    pendingRandomApplyRef.current?.()
    pendingRandomApplyRef.current = null
  }, [])

  const persist = async (updated: PickleballEvent) => {
    try {
      await upsertEvent(updated)
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'Lỗi không xác định'
      alert(`Không thể lưu dữ liệu: ${message}`)
    }
  }

  const groupMatches = useMemo(() => {
    if (!event) return []
    return filterGroupMatches(event.matches)
  }, [event])

  const playoffMatches = useMemo(() => {
    if (!event) return []
    return filterPlayoffMatches(event.matches)
  }, [event])

  const matchesByRound = useMemo(() => {
    const grouped = new Map<number, Match[]>()
    for (const match of groupMatches) {
      const list = grouped.get(match.round) ?? []
      list.push(match)
      grouped.set(match.round, list)
    }
    return [...grouped.entries()].sort(([a], [b]) => a - b)
  }, [groupMatches])

  const pairsByGroup = useMemo(() => {
    if (!event) return []
    const grouped = new Map<string, typeof event.pairs>()
    for (const pair of event.pairs) {
      const key = event.splitGroups
        ? pair.group ?? UNASSIGNED_GROUP_LABEL
        : pair.group ?? 'Tất cả'
      const list = grouped.get(key) ?? []
      list.push(pair)
      grouped.set(key, list)
    }
    return [...grouped.entries()].sort(([a], [b]) => {
      if (a === UNASSIGNED_GROUP_LABEL) return -1
      if (b === UNASSIGNED_GROUP_LABEL) return 1
      return a.localeCompare(b, 'vi')
    })
  }, [event])

  const resolvedGroupCount = useMemo(() => {
    if (!event?.splitGroups) return MIN_GROUP_COUNT
    return resolveGroupCount(event.pairs.length, event.groupCount)
  }, [event])

  const standings = useMemo(() => {
    if (!event) return []
    return calculateStandings(event.pairs, groupMatches, event.splitGroups)
  }, [event, groupMatches])

  const unpairedParticipants = useMemo(() => {
    if (!event) return []
    const usedIds = new Set(event.pairs.flatMap((pair) => [pair.player1Id, pair.player2Id]))
    return event.participants.filter((participant) => !usedIds.has(participant.id))
  }, [event])

  const manualEntryOrderById = useMemo(() => {
    if (!event) return new Map<string, number>()
    const order = new Map<string, number>()
    let pairIndex = 0
    for (const pair of event.pairs) {
      if (!isManualPair(pair)) continue
      pairIndex += 1
      order.set(pair.player1Id, pairIndex)
      order.set(pair.player2Id, pairIndex)
    }
    return order
  }, [event])

  const pairNumberById = useMemo(() => {
    if (!event) return new Map<string, number>()
    const numbers = new Map<string, number>()
    event.pairs.forEach((pair, index) => {
      numbers.set(pair.id, index + 1)
    })
    return numbers
  }, [event])

  const normalizeParticipantName = (value: string) =>
    value.trim().replace(/\s+/g, ' ').toLowerCase()

  const canAddManualPair = useMemo(() => {
    if (!event) return false

    const player1Name = normalizeParticipantName(manualPlayer1Name)
    const player2Name = normalizeParticipantName(manualPlayer2Name)
    if (!player1Name || !player2Name || player1Name === player2Name) return false

    const participant1 = event.participants.find(
      (participant) => normalizeParticipantName(participant.name) === player1Name,
    )
    const participant2 = event.participants.find(
      (participant) => normalizeParticipantName(participant.name) === player2Name,
    )
    if (!participant1 || !participant2) return true

    const usedIds = new Set(event.pairs.flatMap((pair) => [pair.player1Id, pair.player2Id]))
    if (usedIds.has(participant1.id) || usedIds.has(participant2.id)) return false

    return participant1.id !== participant2.id
  }, [event, manualPlayer1Name, manualPlayer2Name])

  if (!isFirebaseConfigured()) {
    return (
      <div>
        <BackLink />
        <div className="mt-6">
          <FirebaseSetupNotice />
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center">
        <p className="text-neutral-500">Đang tải event...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center">
        <p className="text-red-600">Lỗi Firebase: {error}</p>
        <BackLink className="mt-4 inline-block" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="text-center">
        <p className="text-neutral-500">Không tìm thấy event.</p>
        <BackLink className="mt-4 inline-block" />
      </div>
    )
  }

  const handlePasswordConfirm = () => {
    if (!id) return
    if (passwordInput !== event.accessPassword) {
      setPasswordError('Mật khẩu không đúng.')
      return
    }
    grantEventAccess(id)
    setAccessGranted(true)
    setPasswordInput('')
    setPasswordError(null)
  }

  if (!accessGranted && eventRequiresPassword(event.accessPassword)) {
    return (
      <div>
        <BackLink />
        <div className="mt-16 text-center">
          <h2 className="text-xl font-bold text-neutral-900">{event.name}</h2>
          <p className="mt-2 text-sm text-neutral-500">
            Event này yêu cầu mật khẩu để xem.
          </p>
        </div>
        <EventCodeDialog
          open
          title="Nhập mật khẩu"
          message="Nhập mật khẩu event do ban tổ chức cung cấp."
          value={passwordInput}
          inputType="password"
          placeholder="Nhập mật khẩu event"
          error={passwordError}
          confirmLabel="Vào xem"
          onChange={(value) => {
            setPasswordInput(value)
            if (passwordError) setPasswordError(null)
          }}
          onConfirm={handlePasswordConfirm}
          onCancel={() => navigate('/')}
        />
      </div>
    )
  }

  if (event.eventType === 'showmatch') {
    return <ShowMatchEventPage event={event} onPersist={persist} />
  }

  const addParticipants = (rawNames: string[]) => {
    if (event.participantsLocked) {
      alert('Danh sách người tham gia đã được chốt.')
      return
    }
    const existing = new Set(
      event.participants.map((p) => normalizeParticipantName(p.name)),
    )
    const toAdd: Participant[] = []

    for (const rawName of rawNames) {
      const trimmed = rawName.trim()
      if (!trimmed) continue
      const normalized = normalizeParticipantName(trimmed)
      if (existing.has(normalized)) continue
      existing.add(normalized)
      toAdd.push(participantFromClubSelection(trimmed, skillLevel))
    }

    if (toAdd.length === 0) {
      alert('Không có người mới để thêm (có thể đã có trong danh sách).')
      return
    }

    persist({
      ...event,
      participants: [...event.participants, ...toAdd],
    })
  }

  const requestSetupLockToggle = (key: SetupLockKey) => {
    const locked = isSetupLocked(event, key)
    if (!locked) {
      const reason = getSetupLockBlockReason(
        event,
        key,
        unpairedParticipants.length,
      )
      if (reason) {
        alert(reason)
        return
      }
    }
    setSetupLockConfirm({ key, action: locked ? 'unlock' : 'lock' })
  }

  const doSetupLockConfirm = () => {
    if (!setupLockConfirm) return
    if (!verifySetupLockPassword(event, setupLockPassword)) {
      setSetupLockPasswordError('Mật khẩu không đúng.')
      return
    }
    const updated =
      setupLockConfirm.action === 'lock'
        ? applySetupLock(event, setupLockConfirm.key)
        : applySetupUnlock(event, setupLockConfirm.key)
    persist(updated)
    setSetupLockConfirm(null)
    setSetupLockPassword('')
    setSetupLockPasswordError(null)
  }

  const cancelSetupLockConfirm = () => {
    setSetupLockConfirm(null)
    setSetupLockPassword('')
    setSetupLockPasswordError(null)
  }

  const pairsLockBlockReason = getSetupLockBlockReason(
    event,
    'pairs',
    unpairedParticipants.length,
  )
  const groupsLockBlockReason = event.splitGroups
    ? getSetupLockBlockReason(event, 'groups', unpairedParticipants.length)
    : 'Bật chia bảng đấu trước'
  const scheduleLockBlockReason = getSetupLockBlockReason(
    event,
    'schedule',
    unpairedParticipants.length,
  )

  const doRemoveParticipant = () => {
    if (event.participantsLocked || event.pairsLocked) {
      alert('Danh sách người tham gia đã được chốt.')
      setParticipantToDelete(null)
      return
    }
    if (!participantToDelete) return

    const manualPair = event.pairs.find(
      (pair) =>
        isManualPair(pair) &&
        (pair.player1Id === participantToDelete || pair.player2Id === participantToDelete),
    )

    if (manualPair) {
      const partnerId =
        manualPair.player1Id === participantToDelete
          ? manualPair.player2Id
          : manualPair.player1Id
      const partner = event.participants.find((p) => p.id === partnerId)
      const idsToRemove = new Set([participantToDelete])
      if (partner?.isManualEntry) {
        idsToRemove.add(partnerId)
      }

      persist({
        ...event,
        participants: event.participants.filter((p) => !idsToRemove.has(p.id)),
        pairs: event.pairs.filter((p) => p.id !== manualPair.id),
        matches: event.matches.filter(
          (m) => m.pair1Id !== manualPair.id && m.pair2Id !== manualPair.id,
        ),
      })
    } else {
      persist({
        ...event,
        participants: event.participants.filter((p) => p.id !== participantToDelete),
        pairs: [],
        matches: [],
      })
    }

    setParticipantToDelete(null)
  }

  const doRandomPairs = () => {
    if (event.pairsLocked) {
      alert('Cặp đôi đã được chốt.')
      setShowRandomPairsConfirm(false)
      return
    }
    const lockedPairs = event.pairs.filter((pair) => isManualPair(pair))
    const lockedIds = new Set(lockedPairs.flatMap((pair) => [pair.player1Id, pair.player2Id]))
    const remainingParticipants = event.participants.filter((p) => !lockedIds.has(p.id))

    if (lockedPairs.length === 0 && event.participants.length < 2) {
      alert('Cần ít nhất 2 người tham gia để random cặp đôi.')
      return
    }
    if (remainingParticipants.length > 0 && remainingParticipants.length % 2 !== 0) {
      alert('Số người còn lại phải là số chẵn để ghép cặp đôi.')
      return
    }

    let generatedPairs: PickleballEvent['pairs'] = []
    if (remainingParticipants.length > 0) {
      const pairSettings = getRandomPairSettings()
      const result = randomPairs(
        remainingParticipants,
        event.splitGroups,
        event.groupCount,
        {
          avoidFemaleFemalePairs: pairSettings.avoidFemaleFemalePairs,
          getGender: getParticipantGender,
          cannotPair: areParticipantsIncompatible,
        },
      )
      if ('error' in result) {
        alert(result.error)
        return
      }
      generatedPairs = result.pairs.map((pair) => ({ ...pair, locked: false }))
    }

    const finalPairs = event.splitGroups
      ? applyGroupsToPairs(
          [...lockedPairs, ...generatedPairs],
          true,
          event.groupCount,
          'manual',
        )
      : [...lockedPairs, ...generatedPairs]
    const wheelNames =
      remainingParticipants.length > 0
        ? remainingParticipants.map((p) => p.name)
        : event.participants.map((p) => p.name)
    const pairLabels = finalPairs.map((pair) => getPairLabel(pair, event.participants))

    pendingRandomApplyRef.current = () => {
      persist({
        ...event,
        pairs: finalPairs,
        matches: [],
      })
    }

    setShowRandomPairsConfirm(false)
    setRandomWheelSession({ wheelLabels: wheelNames, pairLabels })
  }

  const requestRandomPairs = () => {
    if (event.pairsLocked) {
      alert('Cặp đôi đã được chốt.')
      return
    }
    const lockedPairs = event.pairs.filter((pair) => isManualPair(pair))
    const lockedIds = new Set(lockedPairs.flatMap((pair) => [pair.player1Id, pair.player2Id]))
    const remainingParticipants = event.participants.filter((p) => !lockedIds.has(p.id))

    if (lockedPairs.length === 0 && event.participants.length < 2) {
      alert('Cần ít nhất 2 người tham gia để random cặp đôi.')
      return
    }
    if (remainingParticipants.length > 0 && remainingParticipants.length % 2 !== 0) {
      alert('Số người còn lại phải là số chẵn để ghép cặp đôi.')
      return
    }

    setShowRandomPairsConfirm(true)
  }

  const handleAddManualPair = () => {
    if (event.pairsLocked) {
      alert('Cặp đôi đã được chốt.')
      return
    }
    const player1Name = normalizeParticipantName(manualPlayer1Name)
    const player2Name = normalizeParticipantName(manualPlayer2Name)

    if (!player1Name || !player2Name) {
      alert('Hãy nhập đủ tên 2 người chơi để tạo cặp.')
      return
    }
    if (player1Name === player2Name) {
      alert('Hai người trong một cặp phải khác nhau.')
      return
    }

    if (event.participantsLocked) {
      const exists1 = event.participants.some(
        (p) => normalizeParticipantName(p.name) === player1Name,
      )
      const exists2 = event.participants.some(
        (p) => normalizeParticipantName(p.name) === player2Name,
      )
      if (!exists1 || !exists2) {
        alert(
          'Danh sách người tham gia đã được chốt — chỉ chọn người có sẵn trong danh sách.',
        )
        return
      }
    }

    const allParticipants = [...event.participants]
    const findOrCreateParticipant = (normalizedName: string, rawName: string) => {
      const existed = allParticipants.find(
        (participant) => normalizeParticipantName(participant.name) === normalizedName,
      )
      if (existed) return attachClubPlayerId(existed)

      const created = attachClubPlayerId({
        id: crypto.randomUUID(),
        name: rawName.trim().replace(/\s+/g, ' '),
        skillLevel: 1,
        isManualEntry: true,
      })
      allParticipants.push(created)
      return created
    }

    const participant1 = findOrCreateParticipant(player1Name, manualPlayer1Name)
    const participant2 = findOrCreateParticipant(player2Name, manualPlayer2Name)

    const usedIds = new Set(event.pairs.flatMap((pair) => [pair.player1Id, pair.player2Id]))
    if (usedIds.has(participant1.id) || usedIds.has(participant2.id)) {
      alert('Một trong hai người chơi đã có cặp. Vui lòng nhập người khác.')
      return
    }

    const group =
      event.splitGroups && manualPairGroup ? manualPairGroup : undefined

    persist({
      ...event,
      participants: allParticipants,
      pairs: [
        ...event.pairs,
        {
          id: crypto.randomUUID(),
          player1Id: participant1.id,
          player2Id: participant2.id,
          group,
          locked: true,
          isManual: true,
        },
      ],
      matches: [],
    })
    setManualPlayer1Name('')
    setManualPlayer2Name('')
  }

  const toggleRoundCollapsed = (round: number) => {
    setCollapsedRounds((prev) => {
      const next = new Set(prev)
      if (next.has(round)) next.delete(round)
      else next.add(round)
      return next
    })
  }

  const handleGenerateSchedule = () => {
    if (event.scheduleLocked) {
      alert('Lịch thi đấu đã được chốt.')
      return
    }
    if (event.pairs.length < 2) {
      alert('Cần ít nhất 2 cặp đôi. Hãy random cặp đôi trước.')
      return
    }

    if (event.splitGroups && !allPairsAssignedToGroups(event.pairs, event.groupCount)) {
      alert('Hãy phân bảng cho tất cả cặp đôi trước khi tạo lịch.')
      return
    }

    if (event.courts.length === 0) {
      alert('Hãy thêm ít nhất một sân thi đấu.')
      return
    }

    if (groupMatches.length > 0) {
      setShowRegenerateConfirm(true)
      return
    }

    setShowCreateScheduleConfirm(true)
  }

  const doGenerateSchedule = () => {
    if (event.scheduleLocked) {
      alert('Lịch thi đấu đã được chốt.')
      setShowRegenerateConfirm(false)
      setShowCreateScheduleConfirm(false)
      setScheduleCreateMode(null)
      return
    }
    const newGroupMatches = generateSchedule(event.pairs, event.courts)
    persist({ ...event, matches: [...newGroupMatches, ...playoffMatches] })
    setShowRegenerateConfirm(false)
    setShowCreateScheduleConfirm(false)
    setScheduleCreateMode(null)
    setCollapsedRounds(new Set())
  }

  const toggleScheduleCreateMode = (mode: 'manual') => {
    if (event.scheduleLocked) {
      alert('Lịch thi đấu đã được chốt.')
      return
    }
    setScheduleCreateMode((prev) => (prev === mode ? null : mode))
  }

  const handleCreateManualGroupMatch = (input: {
    round: number
    court: number
    pair1Id: string
    pair2Id: string
  }) => {
    if (event.scheduleLocked) {
      alert('Lịch thi đấu đã được chốt.')
      return
    }
    if (!event.courts.includes(input.court)) {
      alert('Sân không hợp lệ.')
      return
    }

    const pair1 = event.pairs.find((p) => p.id === input.pair1Id)
    const pair2 = event.pairs.find((p) => p.id === input.pair2Id)
    if (!pair1 || !pair2) return

    if (event.splitGroups) {
      if (!pair1.group || !pair2.group) {
        alert('Hai cặp phải được phân bảng trước khi tạo trận thủ công.')
        return
      }
      if (pair1.group !== pair2.group) {
        alert('Hai cặp phải cùng bảng khi đã chia bảng.')
        return
      }
    }

    const sameRoundMatches = groupMatches.filter((m) => m.round === input.round)
    const pairIdsInRound = new Set(
      sameRoundMatches.flatMap((m) => [m.pair1Id, m.pair2Id]),
    )
    if (pairIdsInRound.has(input.pair1Id) || pairIdsInRound.has(input.pair2Id)) {
      alert('Mỗi cặp chỉ được thi đấu một trận trong cùng một vòng.')
      return
    }

    if (sameRoundMatches.some((m) => m.court === input.court)) {
      alert(`Sân ${input.court} đã có trận ở vòng ${input.round}.`)
      return
    }

    const isDuplicateMatchup = groupMatches.some(
      (m) =>
        (m.pair1Id === input.pair1Id && m.pair2Id === input.pair2Id) ||
        (m.pair1Id === input.pair2Id && m.pair2Id === input.pair1Id),
    )
    if (isDuplicateMatchup) {
      alert('Hai cặp này đã có trận đấu trong lịch vòng bảng.')
      return
    }

    const match: Match = {
      id: crypto.randomUUID(),
      pair1Id: input.pair1Id,
      pair2Id: input.pair2Id,
      round: input.round,
      court: input.court,
      phase: 'group',
      completed: false,
    }
    if (pair1.group) match.group = pair1.group

    persist({ ...event, matches: [...event.matches, match] })
  }

  const pendingDeleteMatch = matchToDelete
    ? event.matches.find((m) => m.id === matchToDelete)
    : null

  const deleteMatchMessage = pendingDeleteMatch
    ? (() => {
        const pair1 = event.pairs.find((p) => p.id === pendingDeleteMatch.pair1Id)
        const pair2 = event.pairs.find((p) => p.id === pendingDeleteMatch.pair2Id)
        const label1 = pair1 ? getPairLabel(pair1, event.participants) : '—'
        const label2 = pair2 ? getPairLabel(pair2, event.participants) : '—'
        const namePart = pendingDeleteMatch.name ? ` "${pendingDeleteMatch.name}"` : ''
        return `Bạn có chắc muốn xóa trận${namePart} (${label1} VS ${label2})?`
      })()
    : ''

  const handleDeleteGroupMatch = (matchId: string) => {
    if (event.scheduleLocked) {
      alert('Lịch thi đấu đã được chốt.')
      return
    }
    setMatchToDelete(matchId)
  }

  const parseGroupCountInput = (): number | null => {
    const count = parseInt(groupCountInput, 10)
    if (
      Number.isNaN(count) ||
      count < MIN_GROUP_COUNT ||
      count > MAX_GROUP_COUNT
    ) {
      setGroupCountError(
        `Nhập số bảng từ ${MIN_GROUP_COUNT} đến ${MAX_GROUP_COUNT}.`,
      )
      return null
    }
    return count
  }

  const handleConfirmGroupCountRandom = () => {
    if (event.groupsLocked || event.pairsLocked || event.scheduleLocked) {
      alert(
        event.scheduleLocked
          ? 'Lịch thi đấu đã được chốt.'
          : event.groupsLocked
            ? 'Bảng đấu đã được chốt.'
            : 'Cặp đôi đã được chốt.',
      )
      return
    }
    const count = parseGroupCountInput()
    if (count === null) return

    persist({
      ...event,
      splitGroups: true,
      groupCount: count,
      pairs: randomAssignGroups(event.pairs, count),
      matches: playoffMatches,
    })
    setShowGroupCountDialog(false)
    setGroupCountError(null)
  }

  const handleConfirmGroupCountManual = () => {
    if (event.groupsLocked || event.pairsLocked || event.scheduleLocked) {
      alert(
        event.scheduleLocked
          ? 'Lịch thi đấu đã được chốt.'
          : event.groupsLocked
            ? 'Bảng đấu đã được chốt.'
            : 'Cặp đôi đã được chốt.',
      )
      return
    }
    const count = parseGroupCountInput()
    if (count === null) return

    persist({
      ...event,
      splitGroups: true,
      groupCount: count,
      pairs: applyGroupsToPairs(event.pairs, true, count, 'manual'),
      matches: playoffMatches,
    })
    setShowGroupCountDialog(false)
    setGroupCountError(null)
  }

  const openGroupCountDialog = () => {
    const suggested = resolveGroupCount(event.pairs.length, event.groupCount)
    setGroupCountInput(String(suggested))
    setGroupCountError(null)
    setShowGroupCountDialog(true)
  }

  const handleConfirmEnableSplitGroups = () => {
    if (event.groupsLocked || event.pairsLocked || event.scheduleLocked) {
      alert(
        event.scheduleLocked
          ? 'Lịch thi đấu đã được chốt.'
          : event.groupsLocked
            ? 'Bảng đấu đã được chốt.'
            : 'Cặp đôi đã được chốt.',
      )
      setShowEnableSplitGroupsConfirm(false)
      return
    }
    setShowEnableSplitGroupsConfirm(false)
    openGroupCountDialog()
  }

  const handleRandomizeGroups = () => {
    if (!event.splitGroups) return
    if (event.groupsLocked) {
      alert('Bảng đấu đã được chốt.')
      return
    }
    if (event.scheduleLocked) {
      alert('Lịch thi đấu đã được chốt.')
      return
    }
    setShowRandomizeGroupsConfirm(true)
  }

  const doRandomizeGroups = () => {
    if (!event.splitGroups) return
    if (event.groupsLocked || event.scheduleLocked) {
      alert(
        event.scheduleLocked
          ? 'Lịch thi đấu đã được chốt.'
          : 'Bảng đấu đã được chốt.',
      )
      setShowRandomizeGroupsConfirm(false)
      return
    }
    persist({
      ...event,
      pairs: randomAssignGroups(event.pairs, event.groupCount),
      matches: playoffMatches,
    })
    setShowRandomizeGroupsConfirm(false)
  }

  const handlePairGroupChange = (pairId: string, group: string | undefined) => {
    if (event.groupsLocked) {
      alert('Bảng đấu đã được chốt.')
      return
    }
    persist({
      ...event,
      pairs: event.pairs.map((pair) =>
        pair.id === pairId ? { ...pair, group } : pair,
      ),
    })
  }

  const handleCreatePlayoffMatch = (input: {
    name: string
    court: number
    pair1Id: string
    pair2Id: string
  }) => {
    if (!event.courts.includes(input.court)) {
      alert('Sân không hợp lệ.')
      return
    }

    const match: Match = {
      id: crypto.randomUUID(),
      pair1Id: input.pair1Id,
      pair2Id: input.pair2Id,
      round: 0,
      court: input.court,
      phase: 'playoff',
      name: input.name,
      completed: false,
    }

    persist({ ...event, matches: [...event.matches, match] })
  }

  const handleDeletePlayoffMatch = (matchId: string) => {
    setMatchToDelete(matchId)
  }

  const confirmDeleteMatch = () => {
    if (!matchToDelete) return
    const pendingDelete = event.matches.find((m) => m.id === matchToDelete)
    if (pendingDelete && isGroupMatch(pendingDelete) && event.scheduleLocked) {
      alert('Lịch thi đấu đã được chốt.')
      setMatchToDelete(null)
      return
    }
    persist({
      ...event,
      matches: event.matches.filter((m) => m.id !== matchToDelete),
    })
    setMatchToDelete(null)
    if (selectedMatch?.id === matchToDelete) setSelectedMatch(null)
  }

  const participantPendingDelete = participantToDelete
    ? event.participants.find((p) => p.id === participantToDelete)
    : null

  const manualPairPendingDelete =
    participantToDelete &&
    event.pairs.find(
      (pair) =>
        isManualPair(pair) &&
        (pair.player1Id === participantToDelete || pair.player2Id === participantToDelete),
    )

  const addCourt = () => {
    if (event.scheduleLocked) {
      alert('Lịch thi đấu đã được chốt.')
      return
    }
    const num = parseInt(courtInput, 10)
    if (Number.isNaN(num) || num < 1) return
    if (event.courts.includes(num)) {
      alert(`Sân ${num} đã có trong danh sách.`)
      return
    }

    persist({
      ...event,
      courts: [...event.courts, num].sort((a, b) => a - b),
    })
    setCourtInput('')
  }

  const removeCourt = (court: number) => {
    if (event.scheduleLocked) {
      alert('Lịch thi đấu đã được chốt.')
      return
    }
    persist({
      ...event,
      courts: event.courts.filter((c) => c !== court),
      matches: event.matches.filter(
        (m) => m.phase === 'playoff' || (isGroupMatch(m) && m.court !== court),
      ),
    })
  }

  const handleUpdateResult = (matchId: string, score1: number, score2: number) => {
    persist({
      ...event,
      matches: event.matches.map((m) =>
        m.id === matchId
          ? { ...m, score1, score2, completed: true }
          : m,
      ),
    })
  }

  const handleStartEditEventName = () => {
    setEventNameInput(event.name)
    setIsEditingEventName(true)
  }

  const handleSaveEventName = () => {
    const trimmed = eventNameInput.trim()
    if (!trimmed) {
      alert('Tên event không được để trống.')
      return
    }
    persist({ ...event, name: trimmed })
    setIsEditingEventName(false)
  }

  const availableSections: SectionKey[] =
    groupMatches.length > 0
      ? ['participants', 'pairs', 'schedule', 'standings', 'contribution', 'playoffs']
      : ['participants', 'pairs', 'schedule', 'contribution']

  const handleSaveContribution = (participantContributions: Record<string, number> | undefined) => {
    persist({
      ...event,
      participantContributions,
    })
    setContributionDialogOpen(false)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 pb-2 pt-1">
        <CompactEventHeader
          name={event.name}
          accessCode={event.accessCode}
          isEditingName={isEditingEventName}
          nameInput={eventNameInput}
          onNameInputChange={setEventNameInput}
          onStartRename={handleStartEditEventName}
          onSaveName={handleSaveEventName}
          onCancelRename={() => {
            setIsEditingEventName(false)
            setEventNameInput('')
          }}
          onDelete={handleRequestDeleteEvent}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-8">
        <SectionNavBar
          availableSections={availableSections}
          visibility={sectionVisibility}
          onSetVisibility={setSectionVisible}
          onShowAll={showAllSections}
          onHideAll={hideAllSections}
          dialogSections={['contribution']}
          onDialogOpen={(key) => {
            if (key === 'contribution') setContributionDialogOpen(true)
          }}
        />

        <div className="space-y-6 pt-4">
      <CollapsibleSection
        id="section-participants"
        title="Người tham gia"
        description="Chọn nhiều người từ danh sách CLB, gán trình độ (1 hoặc 2)"
        visible={sectionVisibility.participants}
        headerExtra={
          <SectionLockButton
            locked={event.participantsLocked === true}
            onClick={() => requestSetupLockToggle('participants')}
          />
        }
      >
        {event.participantsLocked && (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            🔒 Đã chốt danh sách người tham gia.
          </p>
        )}
        <Button
          onClick={() => setParticipantPickerOpen(true)}
          disabled={event.participantsLocked}
        >
          + Chọn người chơi
        </Button>

        {event.participants.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {event.participants.map((p) => (
              <div
                key={p.id}
                className="flex min-w-0 items-start justify-between gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900" title={p.name}>
                    {p.name}
                  </p>
                  {p.isManualEntry && manualEntryOrderById.has(p.id) ? (
                    <span className="mt-1 inline-block rounded-full border border-primary-300 bg-primary-100 px-2 py-0.5 text-[10px] font-bold text-primary-800">
                      TT {manualEntryOrderById.get(p.id)}
                    </span>
                  ) : !p.isManualEntry ? (
                    <SkillLevelBadge level={p.skillLevel} className="mt-1" />
                  ) : null}
                </div>
                {!event.participantsLocked && (
                  <button
                    type="button"
                    onClick={() => setParticipantToDelete(p.id)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-neutral-300 bg-neutral-100 text-base font-medium leading-none text-neutral-600 hover:border-neutral-400 hover:bg-neutral-200 hover:text-neutral-800"
                    title="Xóa"
                    aria-label={`Xóa ${p.name}`}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-400">Chưa có người tham gia.</p>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        id="section-pairs"
        title="Cặp đôi"
        description="Ghép ngẫu nhiên — nếu có cả trình độ 1 và 2 thì mỗi cặp gồm 1 người mỗi trình độ"
        visible={sectionVisibility.pairs}
        headerExtra={
          <div className="flex flex-wrap items-center gap-2">
            <SectionLockButton
              locked={event.pairsLocked === true}
              disabled={!event.pairsLocked && !!pairsLockBlockReason}
              disabledTitle={pairsLockBlockReason ?? undefined}
              onClick={() => requestSetupLockToggle('pairs')}
            />
            <label
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap ${
                event.groupsLocked || event.pairsLocked || event.scheduleLocked
                  ? 'cursor-not-allowed opacity-60'
                  : 'cursor-pointer'
              }`}
            >
              <input
                type="checkbox"
                checked={event.splitGroups}
                disabled={event.groupsLocked || event.pairsLocked || event.scheduleLocked}
                onChange={(e) => {
                  if (event.groupsLocked || event.pairsLocked || event.scheduleLocked) {
                    alert(
                      event.scheduleLocked
                        ? 'Lịch thi đấu đã được chốt.'
                        : event.groupsLocked
                          ? 'Bảng đấu đã được chốt.'
                          : 'Cặp đôi đã được chốt.',
                    )
                    return
                  }
                  if (e.target.checked) {
                    setShowEnableSplitGroupsConfirm(true)
                    return
                  }
                  persist({
                    ...event,
                    splitGroups: false,
                    groupCount: undefined,
                    pairs: applyGroupsToPairs(event.pairs, false),
                    matches: playoffMatches,
                  })
                }}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600 disabled:cursor-not-allowed"
              />
              <span className="text-sm font-medium text-neutral-700">Chia bảng đấu</span>
            </label>
            {event.splitGroups ? (
              <SectionLockButton
                locked={event.groupsLocked === true}
                disabled={!event.groupsLocked && !!groupsLockBlockReason}
                disabledTitle={groupsLockBlockReason ?? undefined}
                onClick={() => requestSetupLockToggle('groups')}
              />
            ) : null}
          </div>
        }
      >
        {event.pairsLocked && (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            🔒 Đã chốt cặp đôi.
          </p>
        )}
        {event.splitGroups && event.groupsLocked && (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            🔒 Đã chốt phân bảng.
          </p>
        )}
        <Button
          onClick={requestRandomPairs}
          disabled={event.pairsLocked}
          className="bg-neutral-900 hover:bg-neutral-800"
        >
          🎲 Random cặp đôi
        </Button>

        <div
          className={`mt-4 rounded-xl border border-primary-200 bg-primary-50 p-4 ${
            event.pairsLocked ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          <p className="text-sm font-semibold text-primary-800">✋ Hoặc ghép tay cặp đôi</p>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <PlayerNameInput
              value={manualPlayer1Name}
              onChange={setManualPlayer1Name}
              extraNames={event.participants.map((participant) => participant.name)}
              placeholder="Chọn hoặc nhập người chơi 1"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
            />
            <PlayerNameInput
              value={manualPlayer2Name}
              onChange={setManualPlayer2Name}
              extraNames={event.participants.map((participant) => participant.name)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddManualPair()}
              placeholder="Chọn hoặc nhập người chơi 2"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
            />
            <Button
              onClick={handleAddManualPair}
              disabled={!canAddManualPair}
            >
              + Thêm cặp
            </Button>
          </div>
          {event.splitGroups && !event.groupsLocked && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-neutral-700">Bảng đấu</span>
              <PairGroupSelect
                value={manualPairGroup}
                groupCount={resolvedGroupCount}
                onChange={setManualPairGroup}
                className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
              />
            </div>
          )}
          <p className="mt-2 text-xs text-neutral-500">
            Còn {unpairedParticipants.length} người chưa ghép cặp. Có thể nhập tên mới, hệ thống sẽ
            tự thêm người chơi vào danh sách.
          </p>
        </div>

        {event.pairs.length > 0 && event.splitGroups && !event.groupsLocked && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRandomizeGroups}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              🎲 Xếp bảng ngẫu nhiên
            </button>
            {!allPairsAssignedToGroups(event.pairs, event.groupCount) ? (
              <p className="text-xs text-amber-700">
                Còn cặp chưa phân bảng — chọn bảng cho từng cặp trước khi tạo lịch.
              </p>
            ) : null}
          </div>
        )}

        {event.pairs.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {event.pairs.map((pair) => {
              const pairNumber = pairNumberById.get(pair.id) ?? 0
              const color = getPairColor(pairNumber)
              return (
                <span
                  key={pair.id}
                  className={`inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-xs font-bold ${color.border} ${color.bg} ${color.text}`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full border ${color.swatch}`} />
                  Cặp {pairNumber}
                </span>
              )
            })}
          </div>
        )}

        {event.pairs.length > 0 && (
          <div className="mt-4 space-y-4">
            {pairsByGroup.map(([group, pairs]) => (
              <div key={group}>
                {event.splitGroups && (
                  <h4
                    className={`mb-2 text-sm font-semibold ${
                      group === UNASSIGNED_GROUP_LABEL
                        ? 'text-amber-700'
                        : 'text-secondary-700'
                    }`}
                  >
                    {group}
                  </h4>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {pairs.map((pair) => {
                    const pairNumber = pairNumberById.get(pair.id) ?? 0
                    return (
                      <div key={pair.id} className={pairCardClassName(pairNumber)}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold">Cặp {pairNumber}</p>
                          {event.splitGroups && !event.groupsLocked && (
                            <PairGroupSelect
                              value={pair.group}
                              groupCount={resolvedGroupCount}
                              onChange={(nextGroup) =>
                                handlePairGroupChange(pair.id, nextGroup)
                              }
                              className="max-w-[8.5rem] rounded-md border border-neutral-300 bg-white px-1.5 py-0.5 text-[11px] focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600/20"
                            />
                          )}
                          {event.splitGroups && event.groupsLocked && pair.group && (
                            <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">
                              {pair.group}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm leading-snug">
                          {getPairShortLabel(pair, event.participants)}
                          <PairTypeBadge pair={pair} />
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        id="section-schedule"
        title="Lịch thi đấu"
        description="Thêm sân, rồi tạo lịch tự động hoặc thêm từng trận thủ công"
        visible={sectionVisibility.schedule}
        headerExtra={
          <SectionLockButton
            locked={event.scheduleLocked === true}
            disabled={!event.scheduleLocked && !!scheduleLockBlockReason}
            disabledTitle={scheduleLockBlockReason ?? undefined}
            onClick={() => requestSetupLockToggle('schedule')}
          />
        }
      >
        {event.scheduleLocked && (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            🔒 Đã chốt lịch thi đấu — vẫn có thể nhập kết quả trận.
          </p>
        )}
        <div
          className={`flex flex-wrap items-end gap-3 ${
            event.scheduleLocked ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Số sân
            </label>
            <input
              type="number"
              min={1}
              value={courtInput}
              onChange={(e) => setCourtInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCourt()}
              placeholder="VD: 1, 3, 5"
              className="w-32 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
            />
          </div>
          <button
            type="button"
            onClick={addCourt}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Thêm sân
          </button>
        </div>

        {event.courts.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {event.courts.map((court) => (
              <span
                key={court}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800"
              >
                Sân {court}
                <button
                  type="button"
                  onClick={() => removeCourt(court)}
                  className="text-blue-600 hover:text-blue-900"
                  aria-label={`Xóa sân ${court}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-neutral-600">
            Chưa có sân nào. Hãy thêm số sân trước khi tạo lịch.
          </p>
        )}

        {event.pairs.length >= 2 && !event.scheduleLocked && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleGenerateSchedule}
              disabled={event.courts.length === 0}
              className="rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-sm font-medium text-blue-800 shadow-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:shadow-none"
            >
              📅 Tạo lịch tự động
            </button>
            <button
              type="button"
              onClick={() => toggleScheduleCreateMode('manual')}
              disabled={event.courts.length === 0}
              className={`rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500 disabled:shadow-none ${
                scheduleCreateMode === 'manual'
                  ? 'bg-secondary-600 text-white hover:bg-secondary-700'
                  : 'border border-secondary-500 bg-white text-secondary-700 hover:bg-secondary-50'
              }`}
            >
              ✋ Tạo lịch thủ công
            </button>
          </div>
        )}

        {scheduleCreateMode === 'manual' &&
          !event.scheduleLocked &&
          event.courts.length > 0 &&
          event.pairs.length >= 2 && (
            <ManualSchedulePanel
              pairs={event.pairs}
              participants={event.participants}
              courts={event.courts}
              groupMatches={groupMatches}
              splitGroups={event.splitGroups}
              pairNumberById={pairNumberById}
              onCreateMatch={handleCreateManualGroupMatch}
            />
          )}

        {groupMatches.length > 0 && (
          <>
            <div className="mt-6 flex flex-wrap gap-2">
              {event.pairs.map((pair) => {
                const pairNumber = pairNumberById.get(pair.id) ?? 0
                const color = getPairColor(pairNumber)
                return (
                  <span
                    key={pair.id}
                    className={`inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-xs font-bold ${color.border} ${color.bg} ${color.text}`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full border ${color.swatch}`} />
                    Cặp {pairNumber}
                  </span>
                )
              })}
            </div>

            <div className="mt-5 space-y-8">
              {matchesByRound.map(([round, matches]) => {
                const playingPairIds = new Set(
                  matches.flatMap((m) => [m.pair1Id, m.pair2Id]),
                )
                const restingPairs = event.pairs.filter(
                  (pair) => !playingPairIds.has(pair.id),
                )
                const isCollapsed = collapsedRounds.has(round)
                const completedCount = matches.filter((m) => m.completed).length

                return (
                <div key={round}>
                  <button
                    type="button"
                    onClick={() => toggleRoundCollapsed(round)}
                    className="mb-4 flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-left transition hover:bg-neutral-100"
                    aria-expanded={!isCollapsed}
                  >
                    <span
                      className={`text-xs text-neutral-500 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                      aria-hidden
                    >
                      ▶
                    </span>
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
                      Vòng {round}
                    </h4>
                    <span className="text-xs text-neutral-400">
                      {matches.length} trận
                      {completedCount > 0 ? ` · ${completedCount} xong` : ''}
                      {event.courts.length === 1 ? ' · 1 sân' : ''}
                    </span>
                    <span className="ml-auto text-xs font-medium text-neutral-500">
                      {isCollapsed ? 'Hiện' : 'Ẩn'}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <>
                  {restingPairs.length > 0 && (
                    <p className="mb-3 text-xs text-neutral-500">
                      Nghỉ:{' '}
                      {restingPairs
                        .map((pair) => {
                          const num = pairNumberById.get(pair.id) ?? 0
                          return `Cặp ${num}`
                        })
                        .join(', ')}
                    </p>
                  )}
                  <div
                    className={`grid grid-cols-1 items-stretch gap-4 ${
                      matches.length === 1 ? 'max-w-xl' : 'md:grid-cols-2'
                    }`}
                  >
                    {matches
                      .sort((a, b) => a.court - b.court)
                      .map((match) => {
                        const pair1 = event.pairs.find((p) => p.id === match.pair1Id)
                        const pair2 = event.pairs.find((p) => p.id === match.pair2Id)
                        const pair1Number = pairNumberById.get(match.pair1Id) ?? 0
                        const pair2Number = pairNumberById.get(match.pair2Id) ?? 0

                        return (
                          <div
                            key={match.id}
                            className={`flex h-full flex-col rounded-2xl border p-4 shadow-sm ${
                              match.completed
                                ? 'border-secondary-500 bg-secondary-50'
                                : 'border-neutral-200 bg-white'
                            }`}
                          >
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-lg bg-neutral-800 px-2.5 py-1 text-xs font-bold text-white">
                                  Sân {match.court}
                                </span>
                                {match.group && (
                                  <span className="rounded-lg bg-secondary-50 px-2.5 py-1 text-xs font-semibold text-secondary-700">
                                    {match.group}
                                  </span>
                                )}
                                {match.completed && (
                                  <span className="rounded-lg bg-primary-600 px-2.5 py-1 text-xs font-semibold text-white">
                                    Hoàn thành
                                  </span>
                                )}
                              </div>
                              {!event.scheduleLocked && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteGroupMatch(match.id)}
                                  className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                                >
                                  Xóa
                                </button>
                              )}
                            </div>

                            <div className="grid flex-1 grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] items-stretch gap-2">
                              <PairDisplayCard
                                pair={pair1}
                                pairNumber={pair1Number}
                                participants={event.participants}
                              />
                              <div className="flex items-center justify-center">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-[11px] font-bold text-neutral-700">
                                  VS
                                </span>
                              </div>
                              <PairDisplayCard
                                pair={pair2}
                                pairNumber={pair2Number}
                                participants={event.participants}
                              />
                            </div>

                            {match.completed && (
                              <p className="my-4 text-center text-2xl font-bold text-primary-600">
                                {match.score1} – {match.score2}
                              </p>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedMatch(match)}
                              className="mt-4 w-full rounded-lg border border-secondary-500 bg-secondary-50 py-2.5 text-sm font-semibold text-secondary-700 hover:bg-secondary-50"
                            >
                              {match.completed ? 'Sửa kết quả' : 'Cập nhật kết quả'}
                            </button>
                          </div>
                        )
                      })}
                  </div>
                    </>
                  )}
                </div>
                )
              })}
            </div>
          </>
        )}
      </CollapsibleSection>

      {groupMatches.length > 0 && (
        <CollapsibleSection
          id="section-standings"
          title="Bảng xếp hạng"
          description="Xếp hạng theo số trận thắng, hiệu số điểm và tổng điểm ghi được (chỉ tính vòng bảng)"
          visible={sectionVisibility.standings}
        >
          {!hasCompletedMatches(groupMatches) && (
            <p className="mb-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
              Cập nhật kết quả từng trận để bảng xếp hạng tự động cập nhật.
            </p>
          )}
          <StandingsContent
            groups={standings}
            pairs={event.pairs}
            participants={event.participants}
            splitGroups={event.splitGroups}
          />
        </CollapsibleSection>
      )}

      {groupMatches.length > 0 && event.courts.length > 0 && event.pairs.length >= 2 && (
        <CollapsibleSection
          id="section-playoffs"
          title="Vòng loại trực tiếp"
          description="Tứ kết, bán kết, chung kết — kết quả không cập nhật vào bảng xếp hạng"
          visible={sectionVisibility.playoffs}
        >
          <PlayoffSection
            pairs={event.pairs}
            participants={event.participants}
            courts={event.courts}
            matches={playoffMatches}
            standingsGroups={standings}
            splitGroups={event.splitGroups}
            pairNumberById={pairNumberById}
            onCreateMatch={handleCreatePlayoffMatch}
            onDeleteMatch={handleDeletePlayoffMatch}
            onUpdateResult={setSelectedMatch}
          />
        </CollapsibleSection>
      )}

        </div>
      </div>

      <ContributionDialog
        open={contributionDialogOpen}
        participants={event.participants}
        participantContributions={event.participantContributions}
        onClose={() => setContributionDialogOpen(false)}
        onSave={handleSaveContribution}
      />

      <ResultDialog
        open={!!selectedMatch}
        match={selectedMatch}
        team1Label={
          selectedMatch
            ? getPairLabel(
                event.pairs.find((p) => p.id === selectedMatch.pair1Id)!,
                event.participants,
              )
            : ''
        }
        team2Label={
          selectedMatch
            ? getPairLabel(
                event.pairs.find((p) => p.id === selectedMatch.pair2Id)!,
                event.participants,
              )
            : ''
        }
        onClose={() => setSelectedMatch(null)}
        onSubmit={(s1, s2) => {
          if (selectedMatch) handleUpdateResult(selectedMatch.id, s1, s2)
        }}
      />

      <PlayerPickerDialog
        open={participantPickerOpen}
        multiple
        skillLevel={skillLevel}
        onSkillLevelChange={setSkillLevel}
        excludedNames={event.participants.map((p) => p.name)}
        onClose={() => setParticipantPickerOpen(false)}
        onSelectMany={addParticipants}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Xóa event"
        message={`Bạn có chắc muốn xóa "${event.name}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        confirmVariant="danger"
        onConfirm={handleConfirmDeleteEvent}
        onCancel={() => setDeleteConfirmOpen(false)}
      />

      <ConfirmDialog
        open={!!matchToDelete}
        title="Xóa trận"
        message={deleteMatchMessage}
        confirmLabel="Xóa"
        onConfirm={confirmDeleteMatch}
        onCancel={() => setMatchToDelete(null)}
      />

      <ConfirmDialog
        open={!!participantToDelete}
        title="Xóa người tham gia"
        message={
          manualPairPendingDelete
            ? `Bạn có chắc muốn xóa "${participantPendingDelete?.name ?? ''}"? Cặp ghép tay chứa người này sẽ bị xóa. Các cặp và lịch khác được giữ nguyên.`
            : `Bạn có chắc muốn xóa "${participantPendingDelete?.name ?? ''}"? Toàn bộ cặp đôi và lịch thi đấu hiện tại sẽ bị xóa.`
        }
        confirmLabel="Xóa"
        onConfirm={doRemoveParticipant}
        onCancel={() => setParticipantToDelete(null)}
      />

      <EventCodeDialog
        open={showGroupCountDialog}
        title="Chia bảng đấu"
        message="Nhập số bảng (Bảng A, Bảng B, …). Chọn xếp ngẫu nhiên hoặc tự phân bảng cho từng cặp. Lịch vòng bảng hiện tại sẽ bị xóa."
        value={groupCountInput}
        inputType="number"
        inputMin={MIN_GROUP_COUNT}
        inputMax={MAX_GROUP_COUNT}
        placeholder={`VD: ${MIN_GROUP_COUNT}, 3, 4`}
        confirmLabel="Xếp ngẫu nhiên"
        secondaryConfirmLabel="Phân bảng thủ công"
        error={groupCountError}
        onChange={(value) => {
          setGroupCountInput(value)
          if (groupCountError) setGroupCountError(null)
        }}
        onConfirm={handleConfirmGroupCountRandom}
        onSecondaryConfirm={handleConfirmGroupCountManual}
        onCancel={() => {
          setShowGroupCountDialog(false)
          setGroupCountError(null)
        }}
      />

      <RandomPairWheelOverlay
        open={randomWheelSession !== null}
        labels={randomWheelSession?.wheelLabels ?? []}
        pairLabels={randomWheelSession?.pairLabels ?? []}
        onClose={finishRandomWheel}
      />

      {setupLockConfirm && (
        <EventCodeDialog
          open
          title={getSetupLockConfirmMessage(setupLockConfirm.key, setupLockConfirm.action).title}
          message={
            getSetupLockConfirmMessage(setupLockConfirm.key, setupLockConfirm.action).message
          }
          value={setupLockPassword}
          inputType="password"
          placeholder="Nhập mật khẩu"
          error={setupLockPasswordError}
          confirmLabel={
            getSetupLockConfirmMessage(setupLockConfirm.key, setupLockConfirm.action).confirmLabel
          }
          onChange={(value) => {
            setSetupLockPassword(value)
            if (setupLockPasswordError) setSetupLockPasswordError(null)
          }}
          onConfirm={doSetupLockConfirm}
          onCancel={cancelSetupLockConfirm}
        />
      )}

      <ConfirmDialog
        open={showEnableSplitGroupsConfirm}
        title="Bật chia bảng đấu"
        message="Sau khi bật, bạn sẽ chọn số bảng và phân cặp vào từng bảng. Lịch vòng bảng hiện tại sẽ bị xóa khi áp dụng."
        confirmLabel="Tiếp tục"
        onConfirm={handleConfirmEnableSplitGroups}
        onCancel={() => setShowEnableSplitGroupsConfirm(false)}
      />

      <ConfirmDialog
        open={showRandomizeGroupsConfirm}
        title="Xếp bảng ngẫu nhiên"
        message="Tất cả cặp đôi sẽ được xếp lại ngẫu nhiên vào các bảng. Lịch vòng bảng hiện tại sẽ bị xóa."
        confirmLabel="Xếp ngẫu nhiên"
        onConfirm={doRandomizeGroups}
        onCancel={() => setShowRandomizeGroupsConfirm(false)}
      />

      <ConfirmDialog
        open={showRandomPairsConfirm}
        title="Random cặp đôi"
        message={
          event.pairs.some((pair) => isManualPair(pair))
            ? 'Các cặp ghép tay (✋) sẽ được giữ nguyên. Cặp còn lại sẽ được random lại và lịch thi đấu sẽ bị xóa.'
            : 'Danh sách cặp đôi hiện tại sẽ bị thay thế và lịch thi đấu sẽ bị xóa.'
        }
        confirmLabel="Random"
        onConfirm={doRandomPairs}
        onCancel={() => setShowRandomPairsConfirm(false)}
      />

      <ConfirmDialog
        open={showCreateScheduleConfirm}
        title="Tạo lịch thi đấu"
        message="Hệ thống sẽ tự động tạo lịch vòng bảng (round-robin) từ danh sách cặp đôi hiện tại."
        confirmLabel="Tạo lịch"
        onConfirm={doGenerateSchedule}
        onCancel={() => setShowCreateScheduleConfirm(false)}
      />

      <ConfirmDialog
        open={showRegenerateConfirm}
        title="Tạo lại lịch thi đấu"
        message="Lịch thi đấu hiện tại sẽ bị xóa và tạo mới. Bạn có chắc không?"
        confirmLabel="Tạo lại"
        onConfirm={doGenerateSchedule}
        onCancel={() => setShowRegenerateConfirm(false)}
      />
    </div>
  )
}
