const STORAGE_KEY = 'pickleball_leaderboard_access'

const QUIZ_ITEMS = [
  { question: 'Bạn uống được mấy cốc beer?', answer: '1', caseInsensitive: false },
  { question: 'Uống beer xong thì làm gì?', answer: 'go home', caseInsensitive: true },
  { question: '1 + 1 = ???', answer: '???', caseInsensitive: false },
] as const

export const LEADERBOARD_QUIZ = QUIZ_ITEMS.map(({ question }) => ({ question }))

export function isLeaderboardAccessGranted(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function grantLeaderboardAccess(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // sessionStorage có thể bị chặn — bỏ qua
  }
}

export function verifyLeaderboardAnswer(step: number, input: string): boolean {
  const item = QUIZ_ITEMS[step]
  if (!item) return false

  const trimmed = input.trim()
  if (item.caseInsensitive) {
    return trimmed.toLowerCase() === item.answer
  }
  return trimmed === item.answer
}

export const LEADERBOARD_QUIZ_LENGTH = QUIZ_ITEMS.length
