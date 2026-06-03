import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { RandomPairWheelOverlay } from '../components/RandomPairWheelOverlay'
import { FirebaseSetupNotice } from '../components/FirebaseSetupNotice'
import { PlayoffSection } from '../components/PlayoffSection'
import { ResultDialog } from '../components/ResultDialog'
import { filterGroupMatches, filterPlayoffMatches, isGroupMatch } from '../lib/matches'
import { getPairLabel, randomPairs } from '../lib/pairing'
import { getPairColor, pairCardClassName } from '../lib/pairColors'
import { generateSchedule } from '../lib/schedule'
import { isFirebaseConfigured } from '../lib/firebase'
import { subscribeEvent, upsertEvent } from '../lib/storage'
import { calculateStandings, hasCompletedMatches } from '../lib/standings'
import {
  CollapsibleSection,
  DEFAULT_SECTION_VISIBILITY,
  SectionToggleBar,
  type SectionKey,
} from '../components/CollapsibleSection'
import { StandingsContent } from '../components/StandingsSection'
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
      <div className="flex h-full min-h-[5.5rem] w-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
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
  const [event, setEvent] = useState<PickleballEvent | null>(null)
  const [loading, setLoading] = useState(isFirebaseConfigured())
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(1)
  const [courtInput, setCourtInput] = useState('')
  const [manualPlayer1Name, setManualPlayer1Name] = useState('')
  const [manualPlayer2Name, setManualPlayer2Name] = useState('')
  const [isEditingEventName, setIsEditingEventName] = useState(false)
  const [eventNameInput, setEventNameInput] = useState('')
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [participantToDelete, setParticipantToDelete] = useState<string | null>(null)
  const [showRandomPairsConfirm, setShowRandomPairsConfirm] = useState(false)
  const [randomWheelSession, setRandomWheelSession] = useState<{
    wheelLabels: string[]
    pairLabels: string[]
  } | null>(null)
  const pendingRandomApplyRef = useRef<(() => void) | null>(null)
  const [showCreateScheduleConfirm, setShowCreateScheduleConfirm] = useState(false)
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
  const [sectionVisibility, setSectionVisibility] = useState(DEFAULT_SECTION_VISIBILITY)

  const toggleSection = (key: SectionKey) => {
    setSectionVisibility((prev) => ({ ...prev, [key]: !prev[key] }))
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
    })
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
      const key = pair.group ?? 'Tất cả'
      const list = grouped.get(key) ?? []
      list.push(pair)
      grouped.set(key, list)
    }
    return [...grouped.entries()]
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

  const applyGroups = (pairs: PickleballEvent['pairs'], splitGroups: boolean) => {
    const cleanPairs = pairs.map((pair) => ({ ...pair, group: undefined }))
    if (!splitGroups || cleanPairs.length < 2) return cleanPairs

    const groupCount = Math.min(4, Math.max(2, Math.ceil(cleanPairs.length / 3)))
    return cleanPairs.map((pair, index) => ({
      ...pair,
      group: `Bảng ${String.fromCharCode(65 + (index % groupCount))}`,
    }))
  }

  if (!isFirebaseConfigured()) {
    return (
      <div>
        <Link to="/" className="text-sm text-green-600 hover:underline">
          ← Quay lại danh sách
        </Link>
        <div className="mt-6">
          <FirebaseSetupNotice />
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center">
        <p className="text-slate-500">Đang tải event...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center">
        <p className="text-red-600">Lỗi Firebase: {error}</p>
        <Link to="/" className="mt-4 inline-block text-green-600 hover:underline">
          ← Quay lại
        </Link>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="text-center">
        <p className="text-slate-500">Không tìm thấy event.</p>
        <Link to="/" className="mt-4 inline-block text-green-600 hover:underline">
          ← Quay lại
        </Link>
      </div>
    )
  }

  const addParticipant = () => {
    const trimmed = name.trim()
    if (!trimmed) return

    const participant: Participant = {
      id: crypto.randomUUID(),
      name: trimmed,
      skillLevel,
    }

    persist({
      ...event,
      participants: [...event.participants, participant],
    })
    setName('')
  }

  const doRemoveParticipant = () => {
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
      const result = randomPairs(remainingParticipants, event.splitGroups)
      if ('error' in result) {
        alert(result.error)
        return
      }
      generatedPairs = result.pairs.map((pair) => ({ ...pair, locked: false }))
    }

    const finalPairs = applyGroups([...lockedPairs, ...generatedPairs], event.splitGroups)
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

    const allParticipants = [...event.participants]
    const findOrCreateParticipant = (normalizedName: string, rawName: string) => {
      const existed = allParticipants.find(
        (participant) => normalizeParticipantName(participant.name) === normalizedName,
      )
      if (existed) return existed

      const created: Participant = {
        id: crypto.randomUUID(),
        name: rawName.trim().replace(/\s+/g, ' '),
        skillLevel: 1,
        isManualEntry: true,
      }
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

    let group: string | undefined
    if (event.splitGroups && event.pairs.length >= 2) {
      const nextPairsLength = event.pairs.length + 1
      const groupCount = Math.min(4, Math.max(2, Math.ceil(nextPairsLength / 3)))
      const groupIndex = event.pairs.length % groupCount
      group = `Bảng ${String.fromCharCode(65 + groupIndex)}`
    }

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

  const handleGenerateSchedule = () => {
    if (event.pairs.length < 2) {
      alert('Cần ít nhất 2 cặp đôi. Hãy random cặp đôi trước.')
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
    const newGroupMatches = generateSchedule(event.pairs, event.courts)
    persist({ ...event, matches: [...newGroupMatches, ...playoffMatches] })
    setShowRegenerateConfirm(false)
    setShowCreateScheduleConfirm(false)
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
    persist({
      ...event,
      matches: event.matches.filter((m) => m.id !== matchId),
    })
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
      ? ['participants', 'pairs', 'schedule', 'standings', 'playoffs']
      : ['participants', 'pairs', 'schedule']

  return (
    <div>
      <Link to="/" className="text-sm text-green-600 hover:underline">
        ← Quay lại danh sách
      </Link>

      <div className="mt-4">
        {isEditingEventName ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="text"
              value={eventNameInput}
              onChange={(e) => setEventNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveEventName()}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base font-semibold text-slate-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 sm:max-w-md"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveEventName}
                className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Lưu
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingEventName(false)
                  setEventNameInput('')
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">{event.name}</h2>
            <button
              type="button"
              onClick={handleStartEditEventName}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Sửa tên
            </button>
          </div>
        )}
        <p className="mt-1 text-sm text-slate-500">
          Mã event: <span className="font-semibold text-slate-700">{event.accessCode || '—'}</span>
        </p>
      </div>

      <SectionToggleBar
        visibility={sectionVisibility}
        onToggle={toggleSection}
        onShowAll={showAllSections}
        onHideAll={hideAllSections}
        availableSections={availableSections}
      />

      <CollapsibleSection
        title="Người tham gia"
        description="Nhập tên và trình độ (1 hoặc 2)"
        visible={sectionVisibility.participants}
        onToggle={() => toggleSection('participants')}
        className="mt-6"
      >
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addParticipant()}
            placeholder="Tên người chơi"
            className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          />
          <select
            value={skillLevel}
            onChange={(e) => setSkillLevel(Number(e.target.value) as SkillLevel)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          >
            <option value={1}>Trình độ 1</option>
            <option value={2}>Trình độ 2</option>
          </select>
          <button
            type="button"
            onClick={addParticipant}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Thêm
          </button>
        </div>

        {event.participants.length > 0 ? (
          <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100">
            {event.participants.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <span className="text-sm">
                  <span className="font-medium text-slate-900">{p.name}</span>
                  {p.isManualEntry && manualEntryOrderById.has(p.id) ? (
                    <span className="ml-2 rounded-full border border-violet-400 bg-violet-200 px-2 py-0.5 text-xs font-bold text-violet-900">
                      Trình tự chọn {manualEntryOrderById.get(p.id)}
                    </span>
                  ) : !p.isManualEntry ? (
                    <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      Trình độ {p.skillLevel}
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => setParticipantToDelete(p.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Xóa
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">Chưa có người tham gia.</p>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Cặp đôi"
        description="Ghép ngẫu nhiên — nếu có cả trình độ 1 và 2 thì mỗi cặp gồm 1 người mỗi trình độ"
        visible={sectionVisibility.pairs}
        onToggle={() => toggleSection('pairs')}
      >
        <button
          type="button"
          onClick={requestRandomPairs}
          className="rounded-lg border-2 border-amber-600 bg-amber-500 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-amber-600"
        >
          🎲 Random cặp đôi
        </button>

        <div className="mt-4 rounded-xl border-2 border-violet-300 bg-violet-50 p-4">
          <p className="text-sm font-bold text-violet-900">✋ Hoặc ghép tay cặp đôi</p>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input
              type="text"
              value={manualPlayer1Name}
              onChange={(e) => setManualPlayer1Name(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              placeholder="Nhập tên người chơi 1"
            />
            <input
              type="text"
              value={manualPlayer2Name}
              onChange={(e) => setManualPlayer2Name(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddManualPair()}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              placeholder="Nhập tên người chơi 2"
            />
            <button
              type="button"
              onClick={handleAddManualPair}
              disabled={!canAddManualPair}
              className="rounded-lg border-2 border-violet-500 bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 disabled:text-slate-500"
            >
              + Thêm cặp
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Còn {unpairedParticipants.length} người chưa ghép cặp. Có thể nhập tên mới, hệ thống sẽ
            tự thêm người chơi vào danh sách.
          </p>
        </div>

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
                  <h4 className="mb-2 text-sm font-semibold text-green-700">{group}</h4>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {pairs.map((pair) => {
                    const pairNumber = pairNumberById.get(pair.id) ?? 0
                    return (
                      <div key={pair.id} className={pairCardClassName(pairNumber)}>
                        <p className="font-bold">Cặp {pairNumber}</p>
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
        title="Lịch thi đấu"
        description="Nhập số sân cụ thể để tạo lịch thi đấu vòng bảng"
        visible={sectionVisibility.schedule}
        onToggle={() => toggleSection('schedule')}
      >
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Số sân
            </label>
            <input
              type="number"
              min={1}
              value={courtInput}
              onChange={(e) => setCourtInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCourt()}
              placeholder="VD: 1, 3, 5"
              className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
          </div>
          <button
            type="button"
            onClick={addCourt}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Thêm sân
          </button>
          <button
            type="button"
            onClick={handleGenerateSchedule}
            disabled={event.courts.length === 0}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none bg-blue-600 hover:bg-blue-700 disabled:hover:bg-slate-300"
          >
            📅 Tạo lịch thi đấu
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
          <p className="mt-4 text-sm text-amber-600">
            Chưa có sân nào. Hãy thêm số sân trước khi tạo lịch.
          </p>
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
              {matchesByRound.map(([round, matches]) => (
                <div key={round}>
                  <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Vòng {round}
                  </h4>
                  <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
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
                                ? 'border-green-400 bg-green-50'
                                : 'border-slate-200 bg-white'
                            }`}
                          >
                            <div className="mb-4 flex flex-wrap items-center gap-2">
                              <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-bold text-white">
                                Sân {match.court}
                              </span>
                              {match.group && (
                                <span className="rounded-lg bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                                  {match.group}
                                </span>
                              )}
                              {match.completed && (
                                <span className="rounded-lg bg-green-600 px-2.5 py-1 text-xs font-semibold text-white">
                                  Hoàn thành
                                </span>
                              )}
                            </div>

                            <div className="grid flex-1 grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] items-stretch gap-2">
                              <PairDisplayCard
                                pair={pair1}
                                pairNumber={pair1Number}
                                participants={event.participants}
                              />
                              <div className="flex items-center justify-center">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-700">
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
                              <p className="my-4 text-center text-2xl font-bold text-green-600">
                                {match.score1} – {match.score2}
                              </p>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedMatch(match)}
                              className="mt-4 w-full rounded-lg border border-green-400 bg-green-50 py-2.5 text-sm font-semibold text-green-800 hover:bg-green-100"
                            >
                              {match.completed ? 'Sửa kết quả' : 'Cập nhật kết quả'}
                            </button>
                          </div>
                        )
                      })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CollapsibleSection>

      {groupMatches.length > 0 && (
        <CollapsibleSection
          title="Bảng xếp hạng"
          description="Xếp hạng theo số trận thắng, hiệu số điểm và tổng điểm ghi được (chỉ tính vòng bảng)"
          visible={sectionVisibility.standings}
          onToggle={() => toggleSection('standings')}
        >
          {!hasCompletedMatches(groupMatches) && (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
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
          title="Vòng loại trực tiếp"
          description="Tứ kết, bán kết, chung kết — kết quả không cập nhật vào bảng xếp hạng"
          visible={sectionVisibility.playoffs}
          onToggle={() => toggleSection('playoffs')}
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

      <RandomPairWheelOverlay
        open={randomWheelSession !== null}
        labels={randomWheelSession?.wheelLabels ?? []}
        pairLabels={randomWheelSession?.pairLabels ?? []}
        onClose={finishRandomWheel}
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
        message="Hệ thống sẽ tạo lịch thi đấu vòng bảng từ danh sách cặp đôi hiện tại."
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
