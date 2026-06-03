import type { Pair } from '../types'

export const MIN_GROUP_COUNT = 2
export const MAX_GROUP_COUNT = 26

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

export function applyGroupsToPairs(
  pairs: Pair[],
  splitGroups: boolean,
  groupCount?: number,
): Pair[] {
  const cleanPairs = pairs.map((pair) => ({ ...pair, group: undefined }))
  if (!splitGroups || cleanPairs.length < 2) return cleanPairs

  const count = resolveGroupCount(cleanPairs.length, groupCount)
  return cleanPairs.map((pair, index) => ({
    ...pair,
    group: getGroupForPairIndex(index, count),
  }))
}
