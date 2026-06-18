import type { ClubPlayerGender } from './clubPlayers'
import type { Participant, Pair } from '../types'

export interface RandomPairOptions {
  avoidFemaleFemalePairs?: boolean
  getGender?: (participant: Participant) => ClubPlayerGender
  /** Trả về true nếu hai người không được ghép cùng cặp */
  cannotPair?: (player1: Participant, player2: Participant) => boolean
}

const MAX_PAIR_ATTEMPTS = 300

export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function isFemalePair(
  player1: Participant,
  player2: Participant,
  getGender: (participant: Participant) => ClubPlayerGender,
): boolean {
  return getGender(player1) === 'female' && getGender(player2) === 'female'
}

function isValidPair(
  player1: Participant,
  player2: Participant,
  options?: RandomPairOptions,
): boolean {
  const getGender = options?.getGender
  if (options?.avoidFemaleFemalePairs && getGender && isFemalePair(player1, player2, getGender)) {
    return false
  }
  if (options?.cannotPair?.(player1, player2)) return false
  return true
}

function hasPairConstraints(options?: RandomPairOptions): boolean {
  return !!(options?.avoidFemaleFemalePairs && options.getGender) || !!options?.cannotPair
}

function buildPairsFromLists(listA: Participant[], listB: Participant[]): Pair[] {
  const pairs: Pair[] = []
  for (let i = 0; i < listA.length; i++) {
    pairs.push({
      id: crypto.randomUUID(),
      player1Id: listA[i]!.id,
      player2Id: listB[i]!.id,
    })
  }
  return pairs
}

function pairShuffled(
  participants: Participant[],
  options?: RandomPairOptions,
): Pair[] | { error: string } {
  if (!hasPairConstraints(options)) {
    const shuffled = shuffleArray(participants)
    const pairs: Pair[] = []
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      pairs.push({
        id: crypto.randomUUID(),
        player1Id: shuffled[i]!.id,
        player2Id: shuffled[i + 1]!.id,
      })
    }
    return pairs
  }

  for (let attempt = 0; attempt < MAX_PAIR_ATTEMPTS; attempt++) {
    const shuffled = shuffleArray(participants)
    let valid = true
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      if (!isValidPair(shuffled[i]!, shuffled[i + 1]!, options)) {
        valid = false
        break
      }
    }
    if (valid) {
      const pairs: Pair[] = []
      for (let i = 0; i < shuffled.length - 1; i += 2) {
        pairs.push({
          id: crypto.randomUUID(),
          player1Id: shuffled[i]!.id,
          player2Id: shuffled[i + 1]!.id,
        })
      }
      return pairs
    }
  }

  return {
    error:
      'Không ghép được cặp thỏa rule trong Cài đặt. Thử đổi danh sách người hoặc chỉnh rule random.',
  }
}

function pairCrossLevel(
  level1: Participant[],
  level2: Participant[],
  options?: RandomPairOptions,
): Pair[] | { error: string } {
  if (!hasPairConstraints(options)) {
    const shuffled2 = shuffleArray(level2)
    return buildPairsFromLists(level1, shuffled2)
  }

  for (let attempt = 0; attempt < MAX_PAIR_ATTEMPTS; attempt++) {
    const shuffled2 = shuffleArray(level2)
    let valid = true
    for (let i = 0; i < level1.length; i++) {
      if (!isValidPair(level1[i]!, shuffled2[i]!, options)) {
        valid = false
        break
      }
    }
    if (valid) return buildPairsFromLists(level1, shuffled2)
  }

  return {
    error:
      'Không ghép được cặp thỏa rule trong Cài đặt. Thử đổi danh sách người hoặc chỉnh rule random.',
  }
}

export function randomPairs(
  participants: Participant[],
  _splitGroups: boolean,
  _groupCount?: number,
  options?: RandomPairOptions,
): { pairs: Pair[] } | { error: string } {
  const level1 = participants.filter((p) => p.skillLevel === 1)
  const level2 = participants.filter((p) => p.skillLevel === 2)

  if (level1.length === 0 || level2.length === 0) {
    const shuffledPairs = pairShuffled(participants, options)
    if ('error' in shuffledPairs) return shuffledPairs
    return { pairs: shuffledPairs }
  }

  if (level1.length !== level2.length) {
    return {
      error: `Số người trình độ 1 (${level1.length}) và trình độ 2 (${level2.length}) phải bằng nhau để ghép cặp không cùng trình độ.`,
    }
  }

  const shuffled1 = shuffleArray(level1)
  const crossPairs = pairCrossLevel(shuffled1, level2, options)
  if ('error' in crossPairs) return crossPairs

  return { pairs: crossPairs }
}

export function getPairLabel(
  pair: Pair,
  participants: Participant[],
): string {
  const p1 = participants.find((p) => p.id === pair.player1Id)
  const p2 = participants.find((p) => p.id === pair.player2Id)
  if (!p1 || !p2) return '—'
  return `${p1.name} (${p1.skillLevel}) & ${p2.name} (${p2.skillLevel})`
}
