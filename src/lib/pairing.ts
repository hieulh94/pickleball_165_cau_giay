import { applyGroupsToPairs } from './groups'
import type { Participant, Pair } from '../types'

export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function pairShuffled(participants: Participant[]): Pair[] {
  const shuffled = shuffleArray(participants)
  const pairs: Pair[] = []

  for (let i = 0; i < shuffled.length - 1; i += 2) {
    pairs.push({
      id: crypto.randomUUID(),
      player1Id: shuffled[i].id,
      player2Id: shuffled[i + 1].id,
    })
  }

  return pairs
}

export function randomPairs(
  participants: Participant[],
  splitGroups: boolean,
  groupCount?: number,
): { pairs: Pair[] } | { error: string } {
  const level1 = participants.filter((p) => p.skillLevel === 1)
  const level2 = participants.filter((p) => p.skillLevel === 2)

  // Toàn trình độ 1 hoặc toàn trình độ 2 → ghép ngẫu nhiên bình thường
  if (level1.length === 0 || level2.length === 0) {
    return { pairs: applyGroupsToPairs(pairShuffled(participants), splitGroups, groupCount) }
  }

  // Có cả hai trình độ → ghép chéo, không cùng trình độ
  if (level1.length !== level2.length) {
    return {
      error: `Số người trình độ 1 (${level1.length}) và trình độ 2 (${level2.length}) phải bằng nhau để ghép cặp không cùng trình độ.`,
    }
  }

  const shuffled1 = shuffleArray(level1)
  const shuffled2 = shuffleArray(level2)
  const pairs: Pair[] = []

  for (let i = 0; i < shuffled1.length; i++) {
    pairs.push({
      id: crypto.randomUUID(),
      player1Id: shuffled1[i].id,
      player2Id: shuffled2[i].id,
    })
  }

  return { pairs: applyGroupsToPairs(pairs, splitGroups, groupCount) }
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
