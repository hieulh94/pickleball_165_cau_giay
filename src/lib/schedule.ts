import type { Match, Pair } from '../types'

function matchKey(id1: string, id2: string): string {
  return [id1, id2].sort().join('|')
}

/** Vòng bảng: mỗi cặp chỉ gặp nhau đúng 1 lần, mỗi vòng mỗi cặp chỉ đấu 1 trận */
function generateRoundRobinRounds(
  pairIds: string[],
): { pair1Id: string; pair2Id: string; round: number }[] {
  if (pairIds.length < 2) return []

  const teams = [...pairIds]
  if (teams.length % 2 === 1) {
    teams.push('__BYE__')
  }

  const n = teams.length
  const totalRounds = n - 1
  const matchesPerRound = n / 2
  const result: { pair1Id: string; pair2Id: string; round: number }[] = []
  const seen = new Set<string>()

  let rotation = [...teams]

  for (let round = 0; round < totalRounds; round++) {
    for (let i = 0; i < matchesPerRound; i++) {
      const a = rotation[i]
      const b = rotation[n - 1 - i]
      if (a === '__BYE__' || b === '__BYE__') continue

      const key = matchKey(a, b)
      if (seen.has(key)) continue
      seen.add(key)

      result.push({ pair1Id: a, pair2Id: b, round: round + 1 })
    }

    const fixed = rotation[0]
    const rest = rotation.slice(1)
    rest.unshift(rest.pop()!)
    rotation = [fixed, ...rest]
  }

  return result
}

function assignCourts(
  rawMatches: { pair1Id: string; pair2Id: string; round: number; group?: string }[],
  courts: number[],
): Match[] {
  if (courts.length === 0) return []

  const seen = new Set<string>()
  const uniqueMatches = rawMatches.filter((m) => {
    const key = matchKey(m.pair1Id, m.pair2Id)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const byRound = new Map<number, typeof uniqueMatches>()
  for (const m of uniqueMatches) {
    const list = byRound.get(m.round) ?? []
    list.push(m)
    byRound.set(m.round, list)
  }

  const result: Match[] = []
  let displayRound = 1

  for (const roundNum of [...byRound.keys()].sort((a, b) => a - b)) {
    const roundMatches = byRound.get(roundNum)!
    for (let i = 0; i < roundMatches.length; i += courts.length) {
      const batch = roundMatches.slice(i, i + courts.length)
      batch.forEach((m, courtIdx) => {
        const match: Match = {
          id: crypto.randomUUID(),
          pair1Id: m.pair1Id,
          pair2Id: m.pair2Id,
          round: displayRound,
          court: courts[courtIdx],
          completed: false,
        }
        if (m.group) match.group = m.group
        result.push(match)
      })
      displayRound++
    }
  }

  return result
}

export function generateSchedule(pairs: Pair[], courts: number[]): Match[] {
  if (pairs.length < 2 || courts.length === 0) return []

  const groups = [...new Set(pairs.map((p) => p.group).filter(Boolean))]

  if (groups.length > 0) {
    const allMatches: {
      pair1Id: string
      pair2Id: string
      round: number
      group?: string
    }[] = []

    for (const group of groups) {
      const pairIds = pairs.filter((p) => p.group === group).map((p) => p.id)
      const groupMatches = generateRoundRobinRounds(pairIds).map((m) => ({
        ...m,
        group,
      }))
      allMatches.push(...groupMatches)
    }

    return assignCourts(allMatches, courts)
  }

  const pairIds = pairs.map((p) => p.id)
  return assignCourts(generateRoundRobinRounds(pairIds), courts)
}
