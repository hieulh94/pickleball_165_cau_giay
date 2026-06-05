import type { Pair } from '../types'

export const MIN_GROUP_COUNT = 2
export const MAX_GROUP_COUNT = 26

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function resolveGroupCount(pairCount: number, configured?: number): number {
  if (
    typeof configured === 'number' &&
    configured >= MIN_GROUP_COUNT &&
    configured <= MAX_GROUP_COUNT
  ) {
    return configured
  }
  if (pairCount < 2) return MIN_GROUP_COUNT
  return Math.min(MAX_GROUP_COUNT, Math.max(MIN_GROUP_COUNT, Math.ceil(pairCount / 3)))
}

export function getGroupName(groupIndex: number): string {
  return `Bảng ${String.fromCharCode(65 + (groupIndex % MAX_GROUP_COUNT))}`
}

export function getGroupForPairIndex(pairIndex: number, groupCount: number): string {
  return getGroupName(pairIndex % groupCount)
}

/** Chọn bảng ngẫu nhiên, ưu tiên bảng đang có ít cặp nhất. */
export function assignRandomGroup(
  existingPairs: Pair[],
  groupCount?: number,
): string {
  const count = resolveGroupCount(existingPairs.length + 1, groupCount)
  const groupSizes = Array.from({ length: count }, (_, index) => {
    const name = getGroupName(index)
    return existingPairs.filter((pair) => pair.group === name).length
  })
  const minSize = Math.min(...groupSizes)
  const candidates = groupSizes
    .map((size, index) => (size === minSize ? getGroupName(index) : null))
    .filter((name): name is string => name !== null)

  return candidates[Math.floor(Math.random() * candidates.length)]
}

export function applyGroupsToPairs(
  pairs: Pair[],
  splitGroups: boolean,
  groupCount?: number,
): Pair[] {
  const cleanPairs = pairs.map((pair) => ({ ...pair, group: undefined }))
  if (!splitGroups || cleanPairs.length < 2) return cleanPairs

  const count = resolveGroupCount(cleanPairs.length, groupCount)
  const shuffled = shuffleArray(cleanPairs)

  return shuffled.map((pair, index) => ({
    ...pair,
    group: getGroupForPairIndex(index, count),
  }))
}
