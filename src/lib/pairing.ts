import type { ClubPlayerGender } from './clubPlayers'
import { formatParticipantSkillLabel } from './playerRating'
import type { Participant, Pair } from '../types'

export interface RandomPairOptions {
  avoidFemaleFemalePairs?: boolean
  getGender?: (participant: Participant) => ClubPlayerGender
  /** Elo / điểm để cân bằng cặp (A mạnh ↔ B yếu) */
  getRating?: (participant: Participant) => number
  /** Trả về true nếu hai người không được ghép cùng cặp */
  cannotPair?: (player1: Participant, player2: Participant) => boolean
}

const MAX_PAIR_ATTEMPTS = 300
const DEFAULT_RATING = 1000

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

function ratingOf(participant: Participant, options?: RandomPairOptions): number {
  return options?.getRating?.(participant) ?? DEFAULT_RATING
}

/**
 * Cân bằng cặp A↔B: B (yếu) mạnh→yếu, A (mạnh) yếu→mạnh rồi ghép lần lượt.
 * Tham số: levelB trước, levelA sau.
 */
function orderForBalancedCross(
  levelB: Participant[],
  levelA: Participant[],
  options?: RandomPairOptions,
): { orderedB: Participant[]; orderedA: Participant[] } {
  if (!options?.getRating) {
    return {
      orderedB: shuffleArray(levelB),
      orderedA: shuffleArray(levelA),
    }
  }

  const orderedB = [...levelB].sort(
    (a, b) => ratingOf(b, options) - ratingOf(a, options),
  )
  const orderedA = [...levelA].sort(
    (a, b) => ratingOf(a, options) - ratingOf(b, options),
  )
  return { orderedB, orderedA }
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
  levelB: Participant[],
  levelA: Participant[],
  options?: RandomPairOptions,
): Pair[] | { error: string } {
  const { orderedB, orderedA } = orderForBalancedCross(levelB, levelA, options)

  if (!hasPairConstraints(options)) {
    return buildPairsFromLists(orderedB, orderedA)
  }

  let valid = true
  for (let i = 0; i < orderedB.length; i++) {
    if (!isValidPair(orderedB[i]!, orderedA[i]!, options)) {
      valid = false
      break
    }
  }
  if (valid) return buildPairsFromLists(orderedB, orderedA)

  for (let attempt = 0; attempt < MAX_PAIR_ATTEMPTS; attempt++) {
    const shuffledA = shuffleArray(levelA)
    let ok = true
    for (let i = 0; i < orderedB.length; i++) {
      if (!isValidPair(orderedB[i]!, shuffledA[i]!, options)) {
        ok = false
        break
      }
    }
    if (ok) return buildPairsFromLists(orderedB, shuffledA)
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
  const levelB = participants.filter((p) => p.skillLevel === 'B')
  const levelA = participants.filter((p) => p.skillLevel === 'A')

  if (levelB.length === 0 || levelA.length === 0) {
    const shuffledPairs = pairShuffled(participants, options)
    if ('error' in shuffledPairs) return shuffledPairs
    return { pairs: shuffledPairs }
  }

  if (levelB.length !== levelA.length) {
    return {
      error: `Số người trình độ A (${levelA.length}) và trình độ B (${levelB.length}) phải bằng nhau để ghép cặp không cùng trình độ.`,
    }
  }

  const crossPairs = pairCrossLevel(levelB, levelA, options)
  if ('error' in crossPairs) return crossPairs

  return { pairs: crossPairs }
}

function pairEloSumVariance(
  pairs: Array<[Participant, Participant]>,
  options?: RandomPairOptions,
): number {
  const sums = pairs.map(([a, b]) => ratingOf(a, options) + ratingOf(b, options))
  const mean = sums.reduce((s, v) => s + v, 0) / sums.length
  return sums.reduce((s, v) => s + (v - mean) ** 2, 0)
}

function pairsFromFlatList(list: Participant[]): Array<[Participant, Participant]> {
  const pairs: Array<[Participant, Participant]> = []
  for (let i = 0; i < list.length - 1; i += 2) {
    pairs.push([list[i]!, list[i + 1]!])
  }
  return pairs
}

function isFlatPairingValid(
  list: Participant[],
  options?: RandomPairOptions,
): boolean {
  if (!hasPairConstraints(options)) return true
  for (let i = 0; i < list.length - 1; i += 2) {
    if (!isValidPair(list[i]!, list[i + 1]!, options)) return false
  }
  return true
}

/** Ghép bất kỳ (cho phép AA/BB): tối thiểu variance tổng Elo cặp. */
function findBestEloBalancedPairs(
  participants: Participant[],
  options?: RandomPairOptions,
): Pair[] | { error: string } {
  if (participants.length < 2 || participants.length % 2 !== 0) {
    return { error: 'Số người phải là số chẵn để ghép cặp đôi.' }
  }

  let bestVariance = Infinity
  let bestList: Participant[] | null = null

  // Seed: mạnh nhất ↔ yếu nhất (thường cân Elo tốt)
  const byRating = [...participants].sort(
    (a, b) => ratingOf(b, options) - ratingOf(a, options),
  )
  const folded: Participant[] = []
  let lo = 0
  let hi = byRating.length - 1
  while (lo < hi) {
    folded.push(byRating[lo]!, byRating[hi]!)
    lo += 1
    hi -= 1
  }
  if (isFlatPairingValid(folded, options)) {
    bestVariance = pairEloSumVariance(pairsFromFlatList(folded), options)
    bestList = folded
  }

  const n = participants.length / 2
  const attempts = Math.min(800, n <= 4 ? 48 : 800)
  for (let i = 0; i < attempts; i++) {
    const shuffled = shuffleArray(participants)
    if (!isFlatPairingValid(shuffled, options)) continue
    const v = pairEloSumVariance(pairsFromFlatList(shuffled), options)
    if (v < bestVariance) {
      bestVariance = v
      bestList = shuffled
    }
  }

  if (!bestList) {
    return {
      error: 'Không ghép được cặp thỏa rule. Thử đổi danh sách người hoặc chỉnh rule random.',
    }
  }

  return pairsFromFlatList(bestList).map(([p1, p2]) => ({
    id: crypto.randomUUID(),
    player1Id: p1.id,
    player2Id: p2.id,
  }))
}

/**
 * Random cặp cân bằng Elo:
 * - A = B (và có cả hai): vẫn 1A+1B mỗi cặp, chọn phân bổ tổng Elo gần nhau nhất.
 * - A ≠ B hoặc chỉ một trình độ: ghép tự do (có thể AA/BB) theo cân bằng Elo.
 */
export function randomPairsBalancedElo(
  participants: Participant[],
  options?: RandomPairOptions,
): { pairs: Pair[] } | { error: string } {
  if (participants.length < 2 || participants.length % 2 !== 0) {
    return { error: 'Số người phải là số chẵn để ghép cặp đôi.' }
  }

  const levelB = participants.filter((p) => p.skillLevel === 'B')
  const levelA = participants.filter((p) => p.skillLevel === 'A')
  const canCrossStrict =
    levelA.length > 0 && levelB.length > 0 && levelA.length === levelB.length

  if (!canCrossStrict) {
    const pairs = findBestEloBalancedPairs(participants, options)
    if ('error' in pairs) return pairs
    return { pairs }
  }

  const n = levelA.length
  let bestVariance = Infinity
  let bestA: Participant[] | null = null
  let bestB: Participant[] | null = null

  const attempts = Math.min(500, n <= 4 ? 24 : 500)
  for (let i = 0; i < attempts; i++) {
    const shuffledA = shuffleArray(levelA)
    const shuffledB = shuffleArray(levelB)
    let valid = true
    if (hasPairConstraints(options)) {
      for (let j = 0; j < shuffledA.length; j++) {
        if (!isValidPair(shuffledA[j]!, shuffledB[j]!, options)) {
          valid = false
          break
        }
      }
    }
    if (!valid) continue

    const pairTuples = shuffledA.map(
      (a, idx): [Participant, Participant] => [a, shuffledB[idx]!],
    )
    const v = pairEloSumVariance(pairTuples, options)
    if (v < bestVariance) {
      bestVariance = v
      bestA = shuffledA
      bestB = shuffledB
    }
  }

  if (!bestA || !bestB) {
    return {
      error: 'Không ghép được cặp thỏa rule. Thử đổi danh sách người hoặc chỉnh rule random.',
    }
  }

  return { pairs: buildPairsFromLists(bestA, bestB) }
}

export function getPairLabel(
  pair: Pair,
  participants: Participant[],
): string {
  const p1 = participants.find((p) => p.id === pair.player1Id)
  const p2 = participants.find((p) => p.id === pair.player2Id)
  if (!p1 || !p2) return '—'
  return `${p1.name} (${formatParticipantSkillLabel(p1)}) & ${p2.name} (${formatParticipantSkillLabel(p2)})`
}
