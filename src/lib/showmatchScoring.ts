import type { Match, ShowmatchGame } from '../types'

export function countGamesWon(games: ShowmatchGame[]): { score1: number; score2: number } {
  let score1 = 0
  let score2 = 0
  for (const game of games) {
    if (game.score1 > game.score2) score1 += 1
    else if (game.score2 > game.score1) score2 += 1
  }
  return { score1, score2 }
}

export function isBo3Decided(games: ShowmatchGame[]): boolean {
  const { score1, score2 } = countGamesWon(games)
  return score1 >= 2 || score2 >= 2
}

export function needsGame3(games: ShowmatchGame[]): boolean {
  if (games.length < 2) return false
  const { score1, score2 } = countGamesWon(games.slice(0, 2))
  return score1 === 1 && score2 === 1
}

export function canSavePartialShowmatchGames(games: ShowmatchGame[]): boolean {
  if (games.length === 1) return true
  if (games.length === 2 && needsGame3(games)) return true
  return false
}

function validateGameScores(games: ShowmatchGame[]): string | null {
  for (let i = 0; i < games.length; i += 1) {
    const game = games[i]
    if (
      !Number.isInteger(game.score1) ||
      !Number.isInteger(game.score2) ||
      game.score1 < 0 ||
      game.score2 < 0
    ) {
      return `Ván ${i + 1}: điểm phải là số nguyên không âm.`
    }
    if (game.score1 === game.score2) {
      return `Ván ${i + 1}: không được hòa.`
    }
  }
  return null
}

export function validateShowmatchGames(games: ShowmatchGame[]): string | null {
  if (games.length === 0) {
    return 'Hãy nhập ít nhất một ván.'
  }

  if (games.length > 3) {
    return 'Bo3 chỉ có tối đa 3 ván.'
  }

  const scoreError = validateGameScores(games)
  if (scoreError) return scoreError

  if (games.length === 1) {
    return null
  }

  if (games.length === 2 && needsGame3(games)) {
    return null
  }

  if (isBo3Decided(games)) {
    return null
  }

  if (games.length >= 2) {
    return 'Từ Ván 2 phải nhập đủ kết quả kèo (2-0 hoặc đủ Ván 3).'
  }

  return null
}

export function getShowmatchGamesWon(match: Match): { score1: number; score2: number } | null {
  if (match.games && match.games.length > 0) {
    return countGamesWon(match.games)
  }
  if (match.completed && match.score1 !== undefined && match.score2 !== undefined) {
    return { score1: match.score1, score2: match.score2 }
  }
  return null
}

export function formatGameScoresDetail(games: ShowmatchGame[]): string {
  return games.map((g) => `${g.score1}-${g.score2}`).join(', ')
}

export function formatShowmatchResult(match: Match): string | null {
  const won = getShowmatchGamesWon(match)
  if (!won) return null

  const sets = `${won.score1}–${won.score2}`

  if (match.games && match.games.length > 0) {
    const detail = formatGameScoresDetail(match.games)
    if (!match.completed) {
      return `${sets} (đang đấu · ${detail})`
    }
    return `${sets} (${detail})`
  }

  if (!match.completed) {
    return `${sets} (đang đấu)`
  }

  return sets
}

export function isBo3Match(match: Match): boolean {
  return match.phase === 'showmatch' && match.showmatchFormat === 'best_of_3'
}
