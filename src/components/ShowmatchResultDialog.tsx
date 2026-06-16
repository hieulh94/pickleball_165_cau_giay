import { useEffect, useMemo, useState } from 'react'
import { formatScheduledAt } from '../lib/showmatch'
import {
  canSavePartialShowmatchGames,
  countGamesWon,
  isBo3Decided,
  needsGame3,
  validateShowmatchGames,
} from '../lib/showmatchScoring'
import type { Match, ShowmatchGame } from '../types'

interface GameInput {
  score1: string
  score2: string
}

interface ShowmatchResultDialogProps {
  open: boolean
  match: Match | null
  team1Label: string
  team2Label: string
  onClose: () => void
  onSubmit: (games: ShowmatchGame[]) => void
}

const EMPTY_GAMES: GameInput[] = [
  { score1: '', score2: '' },
  { score1: '', score2: '' },
  { score1: '', score2: '' },
]

function parseGames(inputs: GameInput[]): ShowmatchGame[] {
  const games: ShowmatchGame[] = []
  for (const input of inputs) {
    const hasAny = input.score1 !== '' || input.score2 !== ''
    const hasBoth = input.score1 !== '' && input.score2 !== ''
    if (!hasAny) break
    if (!hasBoth) break

    const score1 = parseInt(input.score1, 10)
    const score2 = parseInt(input.score2, 10)
    if (Number.isNaN(score1) || Number.isNaN(score2)) break
    games.push({ score1, score2 })
  }
  return games
}

function gamesToInputs(games: ShowmatchGame[] | undefined): GameInput[] {
  const inputs = EMPTY_GAMES.map(() => ({ score1: '', score2: '' }))
  if (!games) return inputs
  games.forEach((game, index) => {
    if (index < inputs.length) {
      inputs[index] = {
        score1: String(game.score1),
        score2: String(game.score2),
      }
    }
  })
  return inputs
}

export function ShowmatchResultDialog({
  open,
  match,
  team1Label,
  team2Label,
  onClose,
  onSubmit,
}: ShowmatchResultDialogProps) {
  const [gameInputs, setGameInputs] = useState<GameInput[]>(EMPTY_GAMES)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && match) {
      setGameInputs(gamesToInputs(match.games))
      setShowConfirm(false)
      setError(null)
    }
  }, [open, match])

  const parsedGames = useMemo(() => parseGames(gameInputs), [gameInputs])
  const gamesWon = useMemo(() => countGamesWon(parsedGames), [parsedGames])
  const showGame3 =
    parsedGames.length >= 3 ||
    needsGame3(parsedGames) ||
    gameInputs[2].score1 !== '' ||
    gameInputs[2].score2 !== ''

  if (!open || !match) return null

  const updateGame = (index: number, field: 'score1' | 'score2', value: string) => {
    setGameInputs((prev) =>
      prev.map((game, i) => (i === index ? { ...game, [field]: value } : game)),
    )
    if (error) setError(null)
  }

  const handleSave = () => {
    if (parsedGames.length === 0) {
      setError('Hãy nhập ít nhất một ván.')
      return
    }
    const validationError = validateShowmatchGames(parsedGames)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setShowConfirm(true)
  }

  const handleConfirm = () => {
    onSubmit(parsedGames)
    setShowConfirm(false)
    onClose()
  }

  const renderGameRow = (index: number, label: string, required: boolean) => (
    <div key={label} className="rounded-xl border border-primary-100 bg-primary-50/40 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary-700">
        {label}
        {!required && <span className="ml-1 font-normal normal-case text-neutral-500">(nếu cần)</span>}
      </p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <input
          type="number"
          min={0}
          value={gameInputs[index].score1}
          onChange={(e) => updateGame(index, 'score1', e.target.value)}
          placeholder="Điểm"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
        />
        <span className="text-xs font-bold text-neutral-400">VS</span>
        <input
          type="number"
          min={0}
          value={gameInputs[index].score2}
          onChange={(e) => updateGame(index, 'score2', e.target.value)}
          placeholder="Điểm"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
        />
      </div>
      <p className="mt-1 truncate text-[10px] text-neutral-500">{team1Label}</p>
      <p className="truncate text-[10px] text-neutral-500">{team2Label}</p>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        {!showConfirm ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-neutral-900">Kết quả Bo3</h3>
              <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-bold text-primary-700">
                Chạm 2
              </span>
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              {match.name || 'Showmatch'} · Sân {match.court}
              {match.scheduledAt ? ` · ${formatScheduledAt(match.scheduledAt)}` : ''}
            </p>

            <div className="mt-4 space-y-3">
              {renderGameRow(0, 'Ván 1', true)}
              {renderGameRow(1, 'Ván 2', true)}
              {showGame3 && renderGameRow(2, 'Ván 3', needsGame3(parsedGames))}
            </div>

            {parsedGames.length > 0 && (
              <div className="mt-4 rounded-xl bg-neutral-50 px-4 py-3 text-center">
                <p className="text-xs text-neutral-500">Tỷ số ván</p>
                <p className="text-2xl font-bold text-primary-700">
                  {gamesWon.score1} – {gamesWon.score2}
                </p>
                {canSavePartialShowmatchGames(parsedGames) && (
                  <p className="mt-1 text-xs text-amber-700">
                    {needsGame3(parsedGames)
                      ? 'Tỷ số 1-1 — có thể lưu tạm, cập nhật Ván 3 sau'
                      : 'Chỉ Ván 1 — có thể lưu tạm'}
                  </p>
                )}
                {parsedGames.length >= 2 &&
                  !isBo3Decided(parsedGames) &&
                  !canSavePartialShowmatchGames(parsedGames) && (
                    <p className="mt-1 text-xs text-amber-700">
                      Phải nhập đủ để kết thúc kèo
                    </p>
                  )}
              </div>
            )}

            {error && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={parsedGames.length === 0}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                Lưu kết quả
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-neutral-900">Xác nhận kết quả Bo3</h3>
            <p className="mt-3 text-sm text-neutral-600">
              Bạn có chắc muốn cập nhật kết quả trận này?
            </p>
            <div className="mt-4 space-y-2 rounded-xl bg-neutral-50 p-4 text-center">
              <p className="text-sm font-medium text-neutral-800">{team1Label}</p>
              <p className="text-2xl font-bold text-primary-700">
                {gamesWon.score1} – {gamesWon.score2}
              </p>
              <p className="text-sm font-medium text-neutral-800">{team2Label}</p>
              <p className="mt-2 text-xs text-neutral-500">
                {parsedGames.map((g, i) => `Ván ${i + 1}: ${g.score1}-${g.score2}`).join(' · ')}
              </p>
              {canSavePartialShowmatchGames(parsedGames) && (
                <p className="text-xs text-amber-700">
                  {needsGame3(parsedGames)
                    ? 'Trận sẽ lưu tạm — chờ Ván 3'
                    : 'Trận sẽ lưu tạm sau Ván 1'}
                </p>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Xác nhận
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
