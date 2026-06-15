import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ShowmatchEditDialog } from '../components/ShowmatchEditDialog'
import { ShowmatchResultDialog } from '../components/ShowmatchResultDialog'
import { ShowMatchSection } from '../components/ShowMatchSection'
import { canEditShowmatchInfo } from '../lib/showmatch'
import { filterShowMatches } from '../lib/matches'
import { getPairLabel } from '../lib/pairing'
import {
  createManualPair,
  pruneOrphanShowmatchPairs,
} from '../lib/showmatchParticipants'
import { countGamesWon, isBo3Decided } from '../lib/showmatchScoring'
import type { Match, PickleballEvent, ShowmatchGame } from '../types'

interface ShowMatchEventPageProps {
  event: PickleballEvent
  onPersist: (updated: PickleballEvent) => Promise<void>
}

export function ShowMatchEventPage({ event, onPersist }: ShowMatchEventPageProps) {
  const [isEditingEventName, setIsEditingEventName] = useState(false)
  const [eventNameInput, setEventNameInput] = useState('')
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [matchToDelete, setMatchToDelete] = useState<string | null>(null)
  const [createFormVisible, setCreateFormVisible] = useState(true)

  const showMatches = useMemo(() => filterShowMatches(event.matches), [event.matches])

  const pairNumberById = useMemo(() => {
    const numbers = new Map<string, number>()
    event.pairs.forEach((pair, index) => {
      numbers.set(pair.id, index + 1)
    })
    return numbers
  }, [event.pairs])

  const handleCreateShowMatch = (input: {
    name: string
    scheduledAt: string
    pair1Player1: string
    pair1Player2: string
    pair2Player1: string
    pair2Player2: string
  }) => {
    const pair1Result = createManualPair(event.participants, input.pair1Player1, input.pair1Player2)
    if ('error' in pair1Result) {
      alert(pair1Result.error)
      return
    }

    const pair2Result = createManualPair(
      pair1Result.participants,
      input.pair2Player1,
      input.pair2Player2,
    )
    if ('error' in pair2Result) {
      alert(pair2Result.error)
      return
    }

    const match: Match = {
      id: crypto.randomUUID(),
      pair1Id: pair1Result.pair.id,
      pair2Id: pair2Result.pair.id,
      round: 0,
      court: 0,
      phase: 'showmatch',
      showmatchFormat: 'best_of_3',
      games: [],
      scheduledAt: input.scheduledAt,
      name: input.name || undefined,
      completed: false,
    }

    onPersist({
      ...event,
      participants: pair2Result.participants,
      pairs: [...event.pairs, pair1Result.pair, pair2Result.pair],
      matches: [...event.matches, match],
    })
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

  const handleDeleteShowMatch = (matchId: string) => {
    setMatchToDelete(matchId)
  }

  const confirmDeleteShowMatch = () => {
    if (!matchToDelete) return
    const remainingMatches = event.matches.filter((m) => m.id !== matchToDelete)
    onPersist({
      ...event,
      matches: remainingMatches,
      pairs: pruneOrphanShowmatchPairs(event.pairs, remainingMatches),
    })
    setMatchToDelete(null)
    if (selectedMatch?.id === matchToDelete) setSelectedMatch(null)
  }

  const handleUpdateShowMatch = (
    matchId: string,
    input: {
      name: string
      scheduledAt: string
      pair1Player1: string
      pair1Player2: string
      pair2Player1: string
      pair2Player2: string
    },
  ) => {
    const existing = event.matches.find((m) => m.id === matchId)
    if (!existing) return
    if (!canEditShowmatchInfo(existing)) {
      alert('Không thể sửa thông tin khi đã có kết quả hiệp đấu.')
      return
    }

    const pair1Result = createManualPair(event.participants, input.pair1Player1, input.pair1Player2)
    if ('error' in pair1Result) {
      alert(pair1Result.error)
      return
    }

    const pair2Result = createManualPair(
      pair1Result.participants,
      input.pair2Player1,
      input.pair2Player2,
    )
    if ('error' in pair2Result) {
      alert(pair2Result.error)
      return
    }

    const updatedMatches = event.matches.map((m) =>
      m.id === matchId
        ? {
            ...m,
            pair1Id: pair1Result.pair.id,
            pair2Id: pair2Result.pair.id,
            name: input.name || undefined,
            scheduledAt: input.scheduledAt,
          }
        : m,
    )

    onPersist({
      ...event,
      participants: pair2Result.participants,
      pairs: pruneOrphanShowmatchPairs(
        [...event.pairs, pair1Result.pair, pair2Result.pair],
        updatedMatches,
      ),
      matches: updatedMatches,
    })
  }

  const handleUpdateShowmatchResult = (matchId: string, games: ShowmatchGame[]) => {
    const won = countGamesWon(games)
    const completed = isBo3Decided(games)
    onPersist({
      ...event,
      matches: event.matches.map((m) =>
        m.id === matchId
          ? {
              ...m,
              games,
              score1: won.score1,
              score2: won.score2,
              completed,
            }
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
    onPersist({ ...event, name: trimmed })
    setIsEditingEventName(false)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col pt-4">
      <div className="shrink-0">
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
            <span className="rounded-full bg-fuchsia-100 px-2.5 py-0.5 text-xs font-bold text-fuchsia-800">
              Showmatch
            </span>
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
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-8">
      <div className="mt-6">
        <ShowMatchSection
          pairs={event.pairs}
          participants={event.participants}
          matches={showMatches}
          pairNumberById={pairNumberById}
          createFormVisible={createFormVisible}
          onCreateFormToggle={() => setCreateFormVisible((v) => !v)}
          onCreateMatch={handleCreateShowMatch}
          onDeleteMatch={handleDeleteShowMatch}
          onEditMatch={setEditingMatch}
          onUpdateResult={setSelectedMatch}
        />
      </div>
      </div>

      <ConfirmDialog
        open={!!matchToDelete}
        title="Xóa trận"
        message={deleteMatchMessage}
        confirmLabel="Xóa"
        onConfirm={confirmDeleteShowMatch}
        onCancel={() => setMatchToDelete(null)}
      />

      <ShowmatchEditDialog
        open={!!editingMatch}
        match={editingMatch}
        pairs={event.pairs}
        participants={event.participants}
        onClose={() => setEditingMatch(null)}
        onSubmit={(input) => {
          if (editingMatch) handleUpdateShowMatch(editingMatch.id, input)
        }}
      />

      <ShowmatchResultDialog
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
        onSubmit={(games) => {
          if (selectedMatch) handleUpdateShowmatchResult(selectedMatch.id, games)
        }}
      />
    </div>
  )
}
