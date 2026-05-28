import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { FirebaseSetupNotice } from '../components/FirebaseSetupNotice'
import { ResultDialog } from '../components/ResultDialog'
import { getPairLabel, randomPairs } from '../lib/pairing'
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
import type { Match, Participant, PickleballEvent, SkillLevel } from '../types'

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
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
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

  const persist = async (updated: PickleballEvent) => {
    try {
      await upsertEvent(updated)
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'Lỗi không xác định'
      alert(`Không thể lưu dữ liệu: ${message}`)
    }
  }

  const matchesByRound = useMemo(() => {
    if (!event) return []
    const grouped = new Map<number, Match[]>()
    for (const match of event.matches) {
      const list = grouped.get(match.round) ?? []
      list.push(match)
      grouped.set(match.round, list)
    }
    return [...grouped.entries()].sort(([a], [b]) => a - b)
  }, [event])

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
    return calculateStandings(event.pairs, event.matches, event.splitGroups)
  }, [event])

  const unpairedParticipants = useMemo(() => {
    if (!event) return []
    const usedIds = new Set(event.pairs.flatMap((pair) => [pair.player1Id, pair.player2Id]))
    return event.participants.filter((participant) => !usedIds.has(participant.id))
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

  const removeParticipant = (participantId: string) => {
    persist({
      ...event,
      participants: event.participants.filter((p) => p.id !== participantId),
      pairs: [],
      matches: [],
    })
  }

  const handleRandomPairs = () => {
    if (event.participants.length < 2) {
      alert('Cần ít nhất 2 người tham gia để random cặp đôi.')
      return
    }
    if (event.participants.length % 2 !== 0) {
      alert('Số người tham gia phải là số chẵn để ghép cặp đôi.')
      return
    }

    const result = randomPairs(event.participants, event.splitGroups)
    if ('error' in result) {
      alert(result.error)
      return
    }

    persist({ ...event, pairs: result.pairs, matches: [] })
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

    if (event.matches.length > 0) {
      setShowRegenerateConfirm(true)
      return
    }

    doGenerateSchedule()
  }

  const doGenerateSchedule = () => {
    const matches = generateSchedule(event.pairs, event.courts)
    persist({ ...event, matches })
    setShowRegenerateConfirm(false)
  }

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
      matches: [],
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

  const availableSections: SectionKey[] =
    event.matches.length > 0
      ? ['participants', 'pairs', 'schedule', 'standings']
      : ['participants', 'pairs', 'schedule']

  return (
    <div>
      <Link to="/" className="text-sm text-green-600 hover:underline">
        ← Quay lại danh sách
      </Link>

      <div className="mt-4">
        <h2 className="text-2xl font-bold text-slate-900">{event.name}</h2>
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
                  <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Trình độ {p.skillLevel}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => removeParticipant(p.id)}
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
        headerExtra={
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={event.splitGroups}
              onChange={(e) =>
                persist({ ...event, splitGroups: e.target.checked, pairs: [], matches: [] })
              }
              className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm font-medium text-slate-700">Chia bảng đấu</span>
          </label>
        }
      >
        <button
          type="button"
          onClick={handleRandomPairs}
          className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-amber-600"
        >
          🎲 Random cặp đôi
        </button>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-800">Hoặc ghép tay cặp đôi</p>
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
              className="rounded-lg border border-green-300 bg-white px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
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
          <div className="mt-6 space-y-4">
            {pairsByGroup.map(([group, pairs]) => (
              <div key={group}>
                {event.splitGroups && (
                  <h4 className="mb-2 text-sm font-semibold text-green-700">{group}</h4>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                  {pairs.map((pair, idx) => (
                    <div
                      key={pair.id}
                      className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-900"
                    >
                      Cặp {idx + 1}: {getPairLabel(pair, event.participants)}
                    </div>
                  ))}
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

        {event.matches.length > 0 && (
          <div className="mt-8 space-y-6">
            {matchesByRound.map(([round, matches]) => (
              <div key={round}>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Vòng {round}
                </h4>
                <div className="grid gap-3">
                  {matches
                    .sort((a, b) => a.court - b.court)
                    .map((match) => {
                      const pair1 = event.pairs.find((p) => p.id === match.pair1Id)
                      const pair2 = event.pairs.find((p) => p.id === match.pair2Id)
                      const label1 = pair1
                        ? getPairLabel(pair1, event.participants)
                        : '—'
                      const label2 = pair2
                        ? getPairLabel(pair2, event.participants)
                        : '—'

                      return (
                        <div
                          key={match.id}
                          className={`rounded-xl border p-4 ${
                            match.completed
                              ? 'border-green-200 bg-green-50/50'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                <span className="rounded bg-slate-100 px-2 py-0.5 font-medium">
                                  Sân {match.court}
                                </span>
                                {match.group && (
                                  <span className="rounded bg-green-100 px-2 py-0.5 font-medium text-green-700">
                                    {match.group}
                                  </span>
                                )}
                                {match.completed && (
                                  <span className="rounded bg-green-600 px-2 py-0.5 font-medium text-white">
                                    Hoàn thành
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 text-sm">
                                <p className="font-medium text-slate-900">{label1}</p>
                                <p className="my-1 text-xs text-slate-400">vs</p>
                                <p className="font-medium text-slate-900">{label2}</p>
                              </div>
                              {match.completed && (
                                <p className="mt-2 text-lg font-bold text-green-600">
                                  {match.score1} - {match.score2}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedMatch(match)}
                              className="shrink-0 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50"
                            >
                              {match.completed ? 'Sửa kết quả' : 'Cập nhật kết quả'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {event.matches.length > 0 && (
        <CollapsibleSection
          title="Bảng xếp hạng"
          description="Xếp hạng theo số trận thắng, hiệu số điểm và tổng điểm ghi được"
          visible={sectionVisibility.standings}
          onToggle={() => toggleSection('standings')}
        >
          {!hasCompletedMatches(event.matches) && (
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
