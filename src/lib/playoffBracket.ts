import { isPlayoffMatch } from './matches'
import { getPairIdAtRank, type GroupStandings } from './standings'
import type { Match, PlayoffConfig } from '../types'

export type CreateId = () => string

function nextPowerOf2(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return p
}

function groupLetter(groupName: string): string {
  const match = groupName.match(/Bảng\s+([A-Z])/i)
  if (match) return match[1].toUpperCase()
  const trimmed = groupName.trim()
  return trimmed.charAt(trimmed.length - 1).toUpperCase() || '?'
}

function seedKey(groupName: string, rank: number): string {
  return `${groupLetter(groupName)}${rank}`
}

export function isGroupStageComplete(groupMatches: Match[]): boolean {
  return groupMatches.length > 0 && groupMatches.every((m) => m.completed)
}

export function countCompletedGroupMatches(groupMatches: Match[]): {
  completed: number
  total: number
} {
  return {
    completed: groupMatches.filter((m) => m.completed).length,
    total: groupMatches.length,
  }
}

export function hasCompletedAutoPlayoff(matches: Match[]): boolean {
  return matches.some(
    (m) => isPlayoffMatch(m) && m.playoffBracket != null && m.completed,
  )
}

export function isAutoPlayoffMatch(match: Match): boolean {
  return isPlayoffMatch(match) && match.playoffBracket != null
}

export function validatePlayoffConfig(
  standings: GroupStandings[],
  splitGroups: boolean,
  config: PlayoffConfig,
): string | null {
  if (!splitGroups) {
    return 'Cần bật chia bảng để dùng bracket playoff tự động.'
  }
  if (standings.length < 2) {
    return 'Cần ít nhất 2 bảng.'
  }
  const a = config.championshipSlotsPerGroup
  const b = config.placementSlotsPerGroup
  if (!Number.isInteger(a) || a < 1) {
    return 'Số suất tranh giải mỗi bảng (a) phải ≥ 1.'
  }
  if (!Number.isInteger(b) || b < 0) {
    return 'Số suất tranh hạng mỗi bảng (b) phải ≥ 0.'
  }
  if (a + b < 1) {
    return 'Cấu hình playoff không hợp lệ.'
  }

  const sizes = standings.map((g) => g.standings.length)
  const firstSize = sizes[0]
  if (sizes.some((s) => s !== firstSize)) {
    return 'Các bảng cần cùng số cặp để tự tạo bracket (v1).'
  }
  if (firstSize < a + b) {
    return `Mỗi bảng cần ít nhất ${a + b} cặp (a+b).`
  }
  return null
}

export function getQualifiedSeeds(
  standings: GroupStandings[],
  a: number,
  b: number,
): Map<string, string> {
  const seeds = new Map<string, string>()
  for (const group of standings) {
    if (!group.group) continue
    for (let rank = 1; rank <= a + b; rank++) {
      const pairId = getPairIdAtRank(group, rank)
      if (pairId) {
        seeds.set(seedKey(group.group, rank), pairId)
      }
    }
  }
  return seeds
}

function courtAt(courts: number[], index: number): number {
  if (courts.length === 0) return 1
  return courts[index % courts.length]
}

function championshipRoundName(teamsInRound: number, isPlaceMatch: boolean, placeLow: number, placeHigh: number): string {
  if (isPlaceMatch) {
    return `Tranh hạng ${placeLow}-${placeHigh}`
  }
  if (teamsInRound <= 2) return 'Chung kết'
  if (teamsInRound <= 4) return 'Bán kết'
  if (teamsInRound <= 8) return 'Tứ kết'
  return `Vòng ${teamsInRound}`
}

type ChampNode =
  | { kind: 'seed'; key: string; pairId: string }
  | { kind: 'bye' }
  | { kind: 'match'; matchIndex: number }

/**
 * Vòng 1 tranh giải — rule xoay vòng:
 * A1–B2, B1–C2, C1–A2, … (bảng cuối 1 gặp A2).
 * Nếu a > 2: thêm cùng hạng (N=2: Ar–Br; N≥3: ghép cặp lần lượt).
 */
function buildChampionshipFirstRoundSeeds(
  groups: GroupStandings[],
  a: number,
): ChampNode[] {
  const n = groups.length
  if (n < 2 || a < 1) return []

  const pairings: ChampNode[] = []

  if (a === 1) {
    for (const g of groups) {
      const pairId = getPairIdAtRank(g, 1)
      if (pairId && g.group) {
        pairings.push({ kind: 'seed', key: seedKey(g.group, 1), pairId })
      }
    }
    return pairings
  }

  // a >= 2: cyclic G[i]_1 vs G[(i+1)%n]_2
  for (let i = 0; i < n; i++) {
    const gHome = groups[i]
    const gAway = groups[(i + 1) % n]
    const p1 = getPairIdAtRank(gHome, 1)
    const p2 = getPairIdAtRank(gAway, 2)
    if (!p1 || !p2 || !gHome.group || !gAway.group) continue
    pairings.push(
      { kind: 'seed', key: seedKey(gHome.group, 1), pairId: p1 },
      { kind: 'seed', key: seedKey(gAway.group, 2), pairId: p2 },
    )
  }

  for (let rank = 3; rank <= a; rank++) {
    if (n === 2) {
      const [gA, gB] = groups
      const p1 = getPairIdAtRank(gA, rank)
      const p2 = getPairIdAtRank(gB, rank)
      if (p1 && p2 && gA.group && gB.group) {
        pairings.push(
          { kind: 'seed', key: seedKey(gA.group, rank), pairId: p1 },
          { kind: 'seed', key: seedKey(gB.group, rank), pairId: p2 },
        )
      }
    } else {
      for (let i = 0; i < n; i += 2) {
        const g1 = groups[i]
        if (i + 1 >= n) {
          const p = getPairIdAtRank(g1, rank)
          if (p && g1.group) {
            pairings.push({ kind: 'seed', key: seedKey(g1.group, rank), pairId: p })
            pairings.push({ kind: 'bye' })
          }
          break
        }
        const g2 = groups[i + 1]
        const p1 = getPairIdAtRank(g1, rank)
        const p2 = getPairIdAtRank(g2, rank)
        if (p1 && p2 && g1.group && g2.group) {
          pairings.push(
            { kind: 'seed', key: seedKey(g1.group, rank), pairId: p1 },
            { kind: 'seed', key: seedKey(g2.group, rank), pairId: p2 },
          )
        }
      }
    }
  }

  return pairings
}

/**
 * Bracket tranh giải: vòng 1 theo cyclic A1–B2 / B1–C2 / …,
 * rồi single-elim + tranh 3–4 khi có 2 trận nuôi chung kết.
 */
function buildChampionshipMatches(
  standings: GroupStandings[],
  a: number,
  courts: number[],
  createId: CreateId,
  courtOffset: { value: number },
): Match[] {
  const groups = standings.filter((g) => g.group)
  if (groups.length < 2) return []

  let current = buildChampionshipFirstRoundSeeds(groups, a)
  if (current.filter((node) => node.kind === 'seed').length < 2) return []

  if (current.length % 2 === 1) {
    current.push({ kind: 'bye' })
  }

  const matches: Match[] = []
  let roundNum = 1
  const placeMatchLosers: { matchIndex: number }[] = []

  while (current.length > 1) {
    const next: ChampNode[] = []

    for (let i = 0; i < current.length; i += 2) {
      const left = current[i]
      const right = current[i + 1] ?? ({ kind: 'bye' } as const)

      if (left.kind === 'bye' && right.kind === 'bye') {
        next.push({ kind: 'bye' })
        continue
      }
      if (left.kind === 'bye') {
        next.push(right)
        continue
      }
      if (right.kind === 'bye') {
        next.push(left)
        continue
      }

      const matchIndex = matches.length
      const id = createId()
      const pair1Id = left.kind === 'seed' ? left.pairId : null
      const pair2Id = right.kind === 'seed' ? right.pairId : null
      const pair1Source =
        left.kind === 'seed'
          ? left.key
          : left.kind === 'match'
            ? `W:${matches[left.matchIndex].id}`
            : undefined
      const pair2Source =
        right.kind === 'seed'
          ? right.key
          : right.kind === 'match'
            ? `W:${matches[right.matchIndex].id}`
            : undefined

      matches.push({
        id,
        pair1Id,
        pair2Id,
        round: 0,
        court: courtAt(courts, courtOffset.value++),
        phase: 'playoff',
        name: 'Playoff',
        completed: false,
        playoffBracket: 'championship',
        playoffRound: roundNum,
        pair1Source,
        pair2Source,
      })

      if (left.kind === 'match') {
        matches[left.matchIndex].winnerToMatchId = id
        matches[left.matchIndex].winnerToSlot = 1
      }
      if (right.kind === 'match') {
        matches[right.matchIndex].winnerToMatchId = id
        matches[right.matchIndex].winnerToSlot = 2
      }

      if (current.length === 2) {
        if (left.kind === 'match') placeMatchLosers.push({ matchIndex: left.matchIndex })
        if (right.kind === 'match') placeMatchLosers.push({ matchIndex: right.matchIndex })
      }

      next.push({ kind: 'match', matchIndex })
    }

    if (next.length > 1) {
      const target = nextPowerOf2(next.length)
      while (next.length < target) {
        next.push({ kind: 'bye' })
      }
    }

    if (next.length === 1 && next[0].kind === 'match') {
      matches[next[0].matchIndex].name = 'Chung kết'
    }

    current = next
    roundNum++
  }

  if (placeMatchLosers.length === 2) {
    const left = placeMatchLosers[0]
    const right = placeMatchLosers[1]
    const leftMatch = matches[left.matchIndex]
    const rightMatch = matches[right.matchIndex]
    // Chỉ tranh 3–4 khi 2 trận nuôi CK cùng vòng (tránh R1 lệch vào bronze khi có bye)
    if (leftMatch.playoffRound === rightMatch.playoffRound) {
      const id = createId()
      matches.push({
        id,
        pair1Id: null,
        pair2Id: null,
        round: 0,
        court: courtAt(courts, courtOffset.value++),
        phase: 'playoff',
        name: 'Tranh hạng 3-4',
        completed: false,
        playoffBracket: 'championship',
        playoffRound: roundNum,
        pair1Source: `L:${leftMatch.id}`,
        pair2Source: `L:${rightMatch.id}`,
      })
      matches[left.matchIndex].loserToMatchId = id
      matches[left.matchIndex].loserToSlot = 1
      matches[right.matchIndex].loserToMatchId = id
      matches[right.matchIndex].loserToSlot = 2
    }
  }

  const winnerMatches = matches.filter((m) => m.name !== 'Tranh hạng 3-4')
  const maxRound = Math.max(0, ...winnerMatches.map((m) => m.playoffRound ?? 0))
  for (const m of winnerMatches) {
    if (m.name === 'Chung kết') continue
    const r = m.playoffRound ?? 0
    const roundsFromFinal = maxRound - r
    if (roundsFromFinal === 1) m.name = 'Bán kết'
    else if (roundsFromFinal === 2) m.name = 'Tứ kết'
    else m.name = championshipRoundName(2 ** (roundsFromFinal + 1), false, 1, 2)
  }

  return matches
}

/**
 * Thứ tự seed (1-based) trong list ghép cặp kề nhau — dùng cho mini-bracket tranh hạng.
 * size 4 → [1,4,2,3] (seed1 vs seed4, seed2 vs seed3).
 */
function bracketSeedOrder(size: number): number[] {
  if (size <= 1) return [1]
  const half = bracketSeedOrder(size / 2)
  const result: number[] = []
  for (const s of half) {
    result.push(s)
    result.push(size + 1 - s)
  }
  return result
}

function buildPlacementTwoGroups(
  standings: GroupStandings[],
  a: number,
  b: number,
  courts: number[],
  createId: CreateId,
  courtOffset: { value: number },
): Match[] {
  if (b <= 0) return []
  const groups = standings.filter((g) => g.group)
  if (groups.length !== 2) return []

  const [gA, gB] = groups
  const matches: Match[] = []

  if (b === 1) {
    const rank = a + 1
    const p1 = getPairIdAtRank(gA, rank)
    const p2 = getPairIdAtRank(gB, rank)
    if (!p1 || !p2) return []
    const placeLow = 2 * a + 1
    matches.push({
      id: createId(),
      pair1Id: p1,
      pair2Id: p2,
      round: 0,
      court: courtAt(courts, courtOffset.value++),
      phase: 'playoff',
      name: `Tranh hạng ${placeLow}-${placeLow + 1}`,
      completed: false,
      playoffBracket: 'placement',
      playoffRound: 1,
      pair1Source: seedKey(gA.group!, rank),
      pair2Source: seedKey(gB.group!, rank),
    })
    return matches
  }

  // Round 1: Ar vs Br for r = a+1 .. a+b
  const r1: Match[] = []
  for (let i = 0; i < b; i++) {
    const rank = a + 1 + i
    const p1 = getPairIdAtRank(gA, rank)
    const p2 = getPairIdAtRank(gB, rank)
    if (!p1 || !p2) continue
    const m: Match = {
      id: createId(),
      pair1Id: p1,
      pair2Id: p2,
      round: 0,
      court: courtAt(courts, courtOffset.value++),
      phase: 'playoff',
      name: `${seedKey(gA.group!, rank)} vs ${seedKey(gB.group!, rank)}`,
      completed: false,
      playoffBracket: 'placement',
      playoffRound: 1,
      pair1Source: seedKey(gA.group!, rank),
      pair2Source: seedKey(gB.group!, rank),
    }
    r1.push(m)
    matches.push(m)
  }

  if (r1.length < 2) return matches

  const basePlace = 2 * a + 1

  if (b === 2) {
    // W vs W → higher, L vs L → lower
    const wwId = createId()
    const llId = createId()
    const ww: Match = {
      id: wwId,
      pair1Id: null,
      pair2Id: null,
      round: 0,
      court: courtAt(courts, courtOffset.value++),
      phase: 'playoff',
      name: `Tranh hạng ${basePlace}-${basePlace + 1}`,
      completed: false,
      playoffBracket: 'placement',
      playoffRound: 2,
      pair1Source: `W:${r1[0].id}`,
      pair2Source: `W:${r1[1].id}`,
    }
    const ll: Match = {
      id: llId,
      pair1Id: null,
      pair2Id: null,
      round: 0,
      court: courtAt(courts, courtOffset.value++),
      phase: 'playoff',
      name: `Tranh hạng ${basePlace + 2}-${basePlace + 3}`,
      completed: false,
      playoffBracket: 'placement',
      playoffRound: 2,
      pair1Source: `L:${r1[0].id}`,
      pair2Source: `L:${r1[1].id}`,
    }
    r1[0].winnerToMatchId = wwId
    r1[0].winnerToSlot = 1
    r1[0].loserToMatchId = llId
    r1[0].loserToSlot = 1
    r1[1].winnerToMatchId = wwId
    r1[1].winnerToSlot = 2
    r1[1].loserToMatchId = llId
    r1[1].loserToSlot = 2
    matches.push(ww, ll)
    return matches
  }

  // b >= 3: PM0 = W0 vs W1; PMi = L(i-1) vs W(i+1); PM(b-1) = L(b-2) vs L(b-1)
  const placeMatches: Match[] = []
  for (let i = 0; i < b; i++) {
    const placeLow = basePlace + i * 2
    const id = createId()
    placeMatches.push({
      id,
      pair1Id: null,
      pair2Id: null,
      round: 0,
      court: courtAt(courts, courtOffset.value++),
      phase: 'playoff',
      name: `Tranh hạng ${placeLow}-${placeLow + 1}`,
      completed: false,
      playoffBracket: 'placement',
      playoffRound: 2,
      pair1Source: undefined,
      pair2Source: undefined,
    })
  }

  // Wire R1 → place matches
  // PM0: W0 vs W1
  placeMatches[0].pair1Source = `W:${r1[0].id}`
  placeMatches[0].pair2Source = `W:${r1[1].id}`
  r1[0].winnerToMatchId = placeMatches[0].id
  r1[0].winnerToSlot = 1
  r1[1].winnerToMatchId = placeMatches[0].id
  r1[1].winnerToSlot = 2

  for (let i = 1; i <= b - 2; i++) {
    // PMi: L(i-1) vs W(i+1)
    placeMatches[i].pair1Source = `L:${r1[i - 1].id}`
    placeMatches[i].pair2Source = `W:${r1[i + 1].id}`
    r1[i - 1].loserToMatchId = placeMatches[i].id
    r1[i - 1].loserToSlot = 1
    r1[i + 1].winnerToMatchId = placeMatches[i].id
    r1[i + 1].winnerToSlot = 2
  }

  // Last: L(b-2) vs L(b-1)
  const last = b - 1
  placeMatches[last].pair1Source = `L:${r1[b - 2].id}`
  placeMatches[last].pair2Source = `L:${r1[b - 1].id}`
  r1[b - 2].loserToMatchId = placeMatches[last].id
  r1[b - 2].loserToSlot = 1
  r1[b - 1].loserToMatchId = placeMatches[last].id
  r1[b - 1].loserToSlot = 2

  matches.push(...placeMatches)
  return matches
}

function buildSameRankMiniBracket(
  teams: { key: string; pairId: string }[],
  placeStart: number,
  courts: number[],
  createId: CreateId,
  courtOffset: { value: number },
  roundBase: number,
): Match[] {
  if (teams.length < 2) {
    return []
  }
  if (teams.length === 2) {
    return [
      {
        id: createId(),
        pair1Id: teams[0].pairId,
        pair2Id: teams[1].pairId,
        round: 0,
        court: courtAt(courts, courtOffset.value++),
        phase: 'playoff',
        name: `Tranh hạng ${placeStart}-${placeStart + 1}`,
        completed: false,
        playoffBracket: 'placement',
        playoffRound: roundBase,
        pair1Source: teams[0].key,
        pair2Source: teams[1].key,
      },
    ]
  }

  // Reuse championship-style single elim among these teams for the place block
  const n = teams.length
  const bracketSize = nextPowerOf2(n)
  const seedNumbers = bracketSeedOrder(bracketSize)
  const slots: ({ key: string; pairId: string } | null)[] = seedNumbers.map((seedNum) =>
    seedNum <= n ? teams[seedNum - 1] : null,
  )

  type Node =
    | { kind: 'seed'; key: string; pairId: string }
    | { kind: 'bye' }
    | { kind: 'match'; matchIndex: number }

  let current: Node[] = slots.map((s) =>
    s ? { kind: 'seed' as const, key: s.key, pairId: s.pairId } : { kind: 'bye' as const },
  )

  const matches: Match[] = []
  let roundNum = roundBase
  const placeMatchLosers: number[] = []

  while (current.length > 1) {
    const next: Node[] = []
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i]
      const right = current[i + 1]
      if (left.kind === 'bye' && right.kind === 'bye') {
        next.push({ kind: 'bye' })
        continue
      }
      if (left.kind === 'bye') {
        next.push(right)
        continue
      }
      if (right.kind === 'bye') {
        next.push(left)
        continue
      }

      const id = createId()
      const matchIndex = matches.length
      const pair1Id = left.kind === 'seed' ? left.pairId : null
      const pair2Id = right.kind === 'seed' ? right.pairId : null
      const pair1Source =
        left.kind === 'seed' ? left.key : `W:${matches[left.matchIndex].id}`
      const pair2Source =
        right.kind === 'seed' ? right.key : `W:${matches[right.matchIndex].id}`

      const isFinal = current.length === 2
      const match: Match = {
        id,
        pair1Id,
        pair2Id,
        round: 0,
        court: courtAt(courts, courtOffset.value++),
        phase: 'playoff',
        name: isFinal
          ? `Tranh hạng ${placeStart}-${placeStart + 1}`
          : `Hạng ${placeStart}–${placeStart + n - 1} · Vòng ${roundNum}`,
        completed: false,
        playoffBracket: 'placement',
        playoffRound: roundNum,
        pair1Source,
        pair2Source,
      }
      matches.push(match)

      if (left.kind === 'match') {
        matches[left.matchIndex].winnerToMatchId = id
        matches[left.matchIndex].winnerToSlot = 1
      }
      if (right.kind === 'match') {
        matches[right.matchIndex].winnerToMatchId = id
        matches[right.matchIndex].winnerToSlot = 2
      }

      if (isFinal) {
        if (left.kind === 'match') placeMatchLosers.push(left.matchIndex)
        if (right.kind === 'match') placeMatchLosers.push(right.matchIndex)
      }

      next.push({ kind: 'match', matchIndex })
    }
    current = next
    roundNum++
  }

  if (placeMatchLosers.length === 2) {
    const id = createId()
    const bronze: Match = {
      id,
      pair1Id: null,
      pair2Id: null,
      round: 0,
      court: courtAt(courts, courtOffset.value++),
      phase: 'playoff',
      name: `Tranh hạng ${placeStart + 2}-${placeStart + 3}`,
      completed: false,
      playoffBracket: 'placement',
      playoffRound: roundNum,
      pair1Source: `L:${matches[placeMatchLosers[0]].id}`,
      pair2Source: `L:${matches[placeMatchLosers[1]].id}`,
    }
    matches.push(bronze)
    matches[placeMatchLosers[0]].loserToMatchId = id
    matches[placeMatchLosers[0]].loserToSlot = 1
    matches[placeMatchLosers[1]].loserToMatchId = id
    matches[placeMatchLosers[1]].loserToSlot = 2
  }

  return matches
}

function buildPlacementNGroups(
  standings: GroupStandings[],
  a: number,
  b: number,
  courts: number[],
  createId: CreateId,
  courtOffset: { value: number },
): Match[] {
  if (b <= 0) return []
  const groups = standings.filter((g) => g.group)
  const n = groups.length
  const matches: Match[] = []

  for (let i = 0; i < b; i++) {
    const rank = a + 1 + i
    const teams: { key: string; pairId: string }[] = []
    for (const g of groups) {
      const pairId = getPairIdAtRank(g, rank)
      if (pairId && g.group) {
        teams.push({ key: seedKey(g.group, rank), pairId })
      }
    }
    const placeStart = n * a + i * n + 1
    matches.push(
      ...buildSameRankMiniBracket(
        teams,
        placeStart,
        courts,
        createId,
        courtOffset,
        1 + i,
      ),
    )
  }
  return matches
}

export function buildPlayoffMatches(
  standings: GroupStandings[],
  config: PlayoffConfig,
  courts: number[],
  createId: CreateId = () => crypto.randomUUID(),
): Match[] {
  const a = config.championshipSlotsPerGroup
  const b = config.placementSlotsPerGroup
  const courtOffset = { value: 0 }

  const championship = buildChampionshipMatches(
    standings,
    a,
    courts,
    createId,
    courtOffset,
  )

  const groups = standings.filter((g) => g.group)
  const placement =
    groups.length === 2
      ? buildPlacementTwoGroups(standings, a, b, courts, createId, courtOffset)
      : buildPlacementNGroups(standings, a, b, courts, createId, courtOffset)

  return [...championship, ...placement]
}

export function getMatchWinnerLoser(
  match: Match,
): { winnerId: string; loserId: string } | null {
  if (
    !match.completed ||
    match.score1 === undefined ||
    match.score2 === undefined ||
    !match.pair1Id ||
    !match.pair2Id
  ) {
    return null
  }
  if (match.score1 === match.score2) return null
  if (match.score1 > match.score2) {
    return { winnerId: match.pair1Id, loserId: match.pair2Id }
  }
  return { winnerId: match.pair2Id, loserId: match.pair1Id }
}

function setSlot(match: Match, slot: 1 | 2, pairId: string | null, source?: string): Match {
  if (slot === 1) {
    return {
      ...match,
      pair1Id: pairId,
      ...(source !== undefined ? { pair1Source: source } : {}),
    }
  }
  return {
    ...match,
    pair2Id: pairId,
    ...(source !== undefined ? { pair2Source: source } : {}),
  }
}

function clearDownstreamFrom(
  matches: Match[],
  fromMatchId: string,
): Match[] {
  const byId = new Map(matches.map((m) => [m.id, m]))
  const queue = [fromMatchId]
  const affected = new Set<string>()

  while (queue.length > 0) {
    const id = queue.shift()!
    const m = byId.get(id)
    if (!m) continue
    for (const nextId of [m.winnerToMatchId, m.loserToMatchId]) {
      if (nextId && !affected.has(nextId)) {
        affected.add(nextId)
        queue.push(nextId)
      }
    }
  }

  return matches.map((m) => {
    if (!affected.has(m.id)) return m
    if (m.completed) return m

    let next = m
    const sourceFromChain = (source?: string) => {
      if (!source) return false
      if (!source.startsWith('W:') && !source.startsWith('L:')) return false
      const srcId = source.slice(2)
      return srcId === fromMatchId || affected.has(srcId)
    }

    if (sourceFromChain(m.pair1Source)) {
      next = setSlot(next, 1, null)
    }
    if (sourceFromChain(m.pair2Source)) {
      next = setSlot(next, 2, null)
    }
    if (next.pair1Id == null || next.pair2Id == null) {
      next = {
        ...next,
        score1: undefined,
        score2: undefined,
        completed: false,
      }
    }
    return next
  })
}

/**
 * Cập nhật kết quả trận playoff và điền W/L vào trận tiếp.
 * Nếu sửa điểm, xóa slot TBD ở trận chưa hoàn thành phía dưới.
 */
export function applyPlayoffResult(
  matches: Match[],
  matchId: string,
  score1: number,
  score2: number,
): Match[] {
  const target = matches.find((m) => m.id === matchId)
  if (!target) return matches

  let next = matches.map((m) =>
    m.id === matchId
      ? { ...m, score1, score2, completed: true as const }
      : m,
  )

  // Clear downstream first when re-editing
  next = clearDownstreamFrom(next, matchId)

  const updated = next.find((m) => m.id === matchId)!
  const result = getMatchWinnerLoser(updated)
  if (!result) return next

  const { winnerId, loserId } = result

  next = next.map((m) => {
    let out = m
    if (updated.winnerToMatchId === m.id && updated.winnerToSlot) {
      out = setSlot(out, updated.winnerToSlot, winnerId, `W:${matchId}`)
    }
    if (updated.loserToMatchId === m.id && updated.loserToSlot) {
      out = setSlot(out, updated.loserToSlot, loserId, `L:${matchId}`)
    }
    return out
  })

  return next
}

export function describePlayoffPreview(
  groupCount: number,
  pairsPerGroup: number,
  a: number,
  b: number,
): string {
  const champTeams = groupCount * a
  const placeTeams = groupCount * b
  const parts: string[] = []
  parts.push(
    `${groupCount} bảng × ${pairsPerGroup} cặp → ${champTeams} đội tranh giải`,
  )
  if (placeTeams > 0) {
    const placeStart = champTeams + 1
    const placeEnd = champTeams + placeTeams
    parts.push(`${placeTeams} đội tranh hạng ${placeStart}–${placeEnd}`)
  }
  if (groupCount >= 2 && a >= 2) {
    parts.push('Vòng 1 tranh giải: A1–B2, B1–C2, C1–A2… (xoay vòng)')
  }
  if (groupCount === 2 && b >= 3) {
    parts.push(
      `Tranh hạng: A${a + 1}–B${a + 1}… rồi W/L → hạng ${2 * a + 1}…`,
    )
  } else if (groupCount >= 3 && b > 0) {
    parts.push('Tranh hạng: mini nhánh theo cùng hạng mỗi bảng')
  }
  return parts.join('. ')
}

export function stripAutoPlayoffMatches(matches: Match[]): Match[] {
  return matches.filter((m) => !isAutoPlayoffMatch(m))
}

export function canRegeneratePlayoff(matches: Match[]): boolean {
  return !hasCompletedAutoPlayoff(matches)
}

export interface FinalRankingRow {
  place: number
  pairId: string
}

/** Trận quyết định hạng: Chung kết hoặc "Tranh hạng X-Y". */
function getPlaceRangeFromMatchName(name?: string): { low: number; high: number } | null {
  if (!name) return null
  if (name.trim() === 'Chung kết') return { low: 1, high: 2 }
  const match = name.match(/Tranh hạng\s+(\d+)\s*[-–]\s*(\d+)/i)
  if (!match) return null
  const a = parseInt(match[1], 10)
  const b = parseInt(match[2], 10)
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return null
  return { low: Math.min(a, b), high: Math.max(a, b) }
}

/**
 * Xếp hạng cuối từ các trận quyết định chỗ (Chung kết, Tranh hạng X-Y).
 * Cập nhật dần khi từng trận hoàn thành.
 */
export function calculateFinalRankings(matches: Match[]): FinalRankingRow[] {
  const placeByPair = new Map<string, number>()

  for (const match of matches) {
    if (!isAutoPlayoffMatch(match) || !match.completed) continue
    const range = getPlaceRangeFromMatchName(match.name)
    if (!range) continue
    const result = getMatchWinnerLoser(match)
    if (!result) continue

    placeByPair.set(result.winnerId, range.low)
    placeByPair.set(result.loserId, range.high)
  }

  return [...placeByPair.entries()]
    .map(([pairId, place]) => ({ pairId, place }))
    .sort((a, b) => a.place - b.place || a.pairId.localeCompare(b.pairId))
}

/** Số hạng kỳ vọng = số đội có trong bracket auto (unique pairId đã gán). */
export function expectedFinalPlaceCount(matches: Match[]): number {
  const ids = new Set<string>()
  for (const match of matches) {
    if (!isAutoPlayoffMatch(match)) continue
    if (match.pair1Id) ids.add(match.pair1Id)
    if (match.pair2Id) ids.add(match.pair2Id)
  }
  return ids.size
}

export function isFinalRankingComplete(matches: Match[]): boolean {
  const rankings = calculateFinalRankings(matches)
  const expected = expectedFinalPlaceCount(matches)
  if (expected === 0 || rankings.length === 0) return false
  if (rankings.length < expected) return false
  const places = new Set(rankings.map((r) => r.place))
  for (let p = 1; p <= expected; p++) {
    if (!places.has(p)) return false
  }
  return true
}

