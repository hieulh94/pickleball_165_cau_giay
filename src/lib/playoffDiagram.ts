import type { Match } from '../types'

export type PlayoffDiagramEdgeKind = 'W' | 'L'

export interface PlayoffDiagramEdge {
  fromId: string
  toId: string
  kind: PlayoffDiagramEdgeKind
  toSlot?: 1 | 2
}

export const DIAGRAM_CARD_WIDTH = 252
export const DIAGRAM_CARD_HEIGHT = 148
export const DIAGRAM_COL_GAP = 108
export const DIAGRAM_PAD_X = 20
export const DIAGRAM_PAD_Y = 40
const DIAGRAM_CARD_GAP = 80
const PORT_IN1_Y = 56
const PORT_IN2_Y = 108
const PORT_WIN_Y = 54
const PORT_LOSE_Y = 106

export interface PlayoffDiagramNodePos {
  matchId: string
  column: number
  x: number
  y: number
}

export interface PlayoffDiagramGroup {
  label: string
  matchIds: string[]
}

export interface PlayoffDiagramColumn {
  index: number
  label: string
  groups: PlayoffDiagramGroup[]
}

export interface PlayoffDiagramTrack {
  id: 'championship' | 'placement'
  title: string
  columns: PlayoffDiagramColumn[]
  edges: PlayoffDiagramEdge[]
  matchIds: string[]
}

export function playoffStageLabel(match: Match): string {
  const name = (match.name ?? '').trim() || 'Playoff'
  const hang = name.match(/^(Hạng\s*\d+\s*[–-]\s*\d+)/i)
  if (hang) return hang[1].replace(/-/g, '–')
  if (/\svs\s/i.test(name) && !/^Tranh hạng/i.test(name) && !/^Hạng\s/i.test(name)) {
    return `Vòng ${match.playoffRound ?? 1}`
  }
  return name
}

function playoffStageOrder(label: string): number {
  const n = label.replace(/–/g, '-').toLowerCase()
  if (n === 'tứ kết') return 10
  if (n === 'bán kết') return 20
  if (n === 'chung kết') return 30
  if (n.includes('tranh hạng 3-4')) return 40
  const hang = n.match(/^hạng\s+(\d+)/)
  if (hang) return 50 + parseInt(hang[1], 10)
  const place = n.match(/tranh hạng\s+(\d+)/)
  if (place) return 80 + parseInt(place[1], 10)
  if (n.startsWith('vòng ')) {
    const r = n.match(/vòng\s+(\d+)/)
    return 5 + (r ? parseInt(r[1], 10) : 0)
  }
  if (/\svs\s/i.test(n)) return 1
  return 200
}

function feedMatchId(source?: string): { id: string; kind: PlayoffDiagramEdgeKind } | null {
  if (!source) return null
  if (source.startsWith('W:')) return { id: source.slice(2), kind: 'W' }
  if (source.startsWith('L:')) return { id: source.slice(2), kind: 'L' }
  return null
}

function computeDepths(matches: Match[]): Map<string, number> {
  const byId = new Map(matches.map((m) => [m.id, m]))
  const memo = new Map<string, number>()
  const visiting = new Set<string>()

  const depthOf = (id: string): number => {
    const cached = memo.get(id)
    if (cached !== undefined) return cached
    if (visiting.has(id)) return 0
    visiting.add(id)

    const match = byId.get(id)
    if (!match) {
      memo.set(id, 0)
      visiting.delete(id)
      return 0
    }

    const parents: number[] = []
    for (const source of [match.pair1Source, match.pair2Source]) {
      const feed = feedMatchId(source)
      if (feed && byId.has(feed.id)) {
        parents.push(depthOf(feed.id))
      }
    }

    const depth = parents.length === 0 ? 0 : Math.max(...parents) + 1
    memo.set(id, depth)
    visiting.delete(id)
    return depth
  }

  for (const match of matches) {
    depthOf(match.id)
  }
  return memo
}

function layoutTrack(
  id: PlayoffDiagramTrack['id'],
  title: string,
  matches: Match[],
): PlayoffDiagramTrack | null {
  if (matches.length === 0) return null

  const depths = computeDepths(matches)
  const maxDepth = Math.max(0, ...depths.values())

  const columns: PlayoffDiagramColumn[] = []
  for (let index = 0; index <= maxDepth; index++) {
    const columnMatches = matches.filter((m) => (depths.get(m.id) ?? 0) === index)
    if (columnMatches.length === 0) continue

    const buckets = new Map<string, Match[]>()
    for (const match of columnMatches) {
      const label = playoffStageLabel(match)
      const list = buckets.get(label) ?? []
      list.push(match)
      buckets.set(label, list)
    }

    const groups = [...buckets.entries()]
      .sort(
        (a, b) =>
          playoffStageOrder(a[0]) - playoffStageOrder(b[0]) || a[0].localeCompare(b[0], 'vi'),
      )
      .map(([label, list]) => ({
        label,
        matchIds: list.map((m) => m.id),
      }))

    const columnLabel = groups.length === 1 ? groups[0].label : ''

    columns.push({ index, label: columnLabel, groups })
  }

  const matchIdSet = new Set(matches.map((m) => m.id))
  const edges: PlayoffDiagramEdge[] = []
  const edgeKey = new Set<string>()

  const pushEdge = (
    fromId: string,
    toId: string,
    kind: PlayoffDiagramEdgeKind,
    toSlot?: 1 | 2,
  ) => {
    if (!matchIdSet.has(fromId) || !matchIdSet.has(toId)) return
    const key = `${kind}:${fromId}->${toId}`
    if (edgeKey.has(key)) return
    edgeKey.add(key)
    edges.push({ fromId, toId, kind, toSlot })
  }

  for (const match of matches) {
    if (match.winnerToMatchId) {
      pushEdge(match.id, match.winnerToMatchId, 'W', match.winnerToSlot)
    }
    if (match.loserToMatchId) {
      pushEdge(match.id, match.loserToMatchId, 'L', match.loserToSlot)
    }
    for (const slot of [1, 2] as const) {
      const source = slot === 1 ? match.pair1Source : match.pair2Source
      const feed = feedMatchId(source)
      if (!feed) continue
      pushEdge(feed.id, match.id, feed.kind, slot)
    }
  }

  return {
    id,
    title,
    columns,
    edges,
    matchIds: matches.map((m) => m.id),
  }
}

export function layoutPlayoffTracks(matches: Match[]): PlayoffDiagramTrack[] {
  const championship = matches.filter((m) => m.playoffBracket === 'championship')
  const placement = matches.filter((m) => m.playoffBracket === 'placement')

  return [
    layoutTrack('championship', 'Nhánh tranh giải', championship),
    layoutTrack('placement', 'Nhánh tranh hạng', placement),
  ].filter((track): track is PlayoffDiagramTrack => track != null)
}

export function describeFeedSource(
  source: string | undefined,
  matchesById: Map<string, Match>,
): string {
  if (!source) return 'Chờ đội'
  const feed = feedMatchId(source)
  if (!feed) return source
  const origin = matchesById.get(feed.id)
  const originName = playoffStageLabel(origin ?? ({ name: 'trận trước' } as Match))
  return feed.kind === 'W' ? `Thắng ${originName}` : `Thua ${originName}`
}

export function formatGroupSeed(groupName: string | null | undefined, rank: number): string {
  if (!groupName) return String(rank)
  const match = groupName.match(/Bảng\s+([A-Z])/i)
  const letter =
    match?.[1]?.toUpperCase() ?? (groupName.trim().slice(-1).toUpperCase() || '?')
  return `${letter}${rank}`
}

export interface GroupSeedAppearance {
  matchName: string
  bracket: 'championship' | 'placement' | null
}

export function collectPlayoffSeedAppearances(
  matches: Match[],
): Map<string, GroupSeedAppearance> {
  const map = new Map<string, GroupSeedAppearance>()
  for (const match of matches) {
    for (const source of [match.pair1Source, match.pair2Source]) {
      if (!source || source.startsWith('W:') || source.startsWith('L:')) continue
      if (map.has(source)) continue
      map.set(source, {
        matchName: playoffStageLabel(match),
        bracket: match.playoffBracket ?? null,
      })
    }
  }
  return map
}

function flattenColumn(column: PlayoffDiagramColumn): string[] {
  return column.groups.flatMap((group) => group.matchIds)
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function resolveOverlaps(ids: string[], yById: Map<string, number>, minGap: number): void {
  const ordered = [...ids].sort((a, b) => (yById.get(a) ?? 0) - (yById.get(b) ?? 0))
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1]!
    const cur = ordered[i]!
    const minY = (yById.get(prev) ?? 0) + DIAGRAM_CARD_HEIGHT + minGap
    const curY = yById.get(cur) ?? 0
    if (curY < minY) yById.set(cur, minY)
  }
}

function roundedOrtho(x1: number, y1: number, x2: number, y2: number, busX: number): string {
  const r = 10
  const bus = Math.max(x1 + 16, Math.min(busX, x2 - 16))
  if (Math.abs(y2 - y1) < 6) {
    return `M ${x1} ${y1} H ${x2}`
  }
  const dir = y2 > y1 ? 1 : -1
  if (Math.abs(y2 - y1) < r * 2) {
    return `M ${x1} ${y1} H ${bus} V ${y2} H ${x2}`
  }
  return [
    `M ${x1} ${y1}`,
    `H ${bus - r}`,
    `Q ${bus} ${y1} ${bus} ${y1 + dir * r}`,
    `V ${y2 - dir * r}`,
    `Q ${bus} ${y2} ${bus + r} ${y2}`,
    `H ${x2}`,
  ].join(' ')
}

export interface PlayoffDiagramConnector {
  path: string
  kind: PlayoffDiagramEdgeKind
}

export function buildTrackConnectors(
  track: PlayoffDiagramTrack,
  positions: Map<string, PlayoffDiagramNodePos>,
): PlayoffDiagramConnector[] {
  const busByDest = new Map<string, { W: number; L: number }>()
  for (const edge of track.edges) {
    const from = positions.get(edge.fromId)
    if (!from) continue
    const fromRight = from.x + DIAGRAM_CARD_WIDTH
    const current = busByDest.get(edge.toId) ?? { W: fromRight + 22, L: fromRight + 46 }
    if (edge.kind === 'W') current.W = Math.min(current.W, fromRight + 22)
    else current.L = Math.min(current.L, fromRight + 48)
    busByDest.set(edge.toId, current)
  }

  const connectors: PlayoffDiagramConnector[] = []
  for (const edge of track.edges) {
    const from = positions.get(edge.fromId)
    const to = positions.get(edge.toId)
    if (!from || !to) continue
    const startY = from.y + (edge.kind === 'W' ? PORT_WIN_Y : PORT_LOSE_Y)
    const endY = to.y + ((edge.toSlot ?? 1) === 2 ? PORT_IN2_Y : PORT_IN1_Y)
    const bus = busByDest.get(edge.toId)
    const busX =
      edge.kind === 'W' ? (bus?.W ?? from.x + DIAGRAM_CARD_WIDTH + 22) : (bus?.L ?? from.x + DIAGRAM_CARD_WIDTH + 48)
    connectors.push({
      kind: edge.kind,
      path: roundedOrtho(from.x + DIAGRAM_CARD_WIDTH, startY, to.x, endY, busX),
    })
  }
  return connectors
}

export function layoutTrackPositions(track: PlayoffDiagramTrack): {
  positions: Map<string, PlayoffDiagramNodePos>
  width: number
  height: number
} {
  const yById = new Map<string, number>()
  const incoming = new Map<string, PlayoffDiagramEdge[]>()
  for (const edge of track.edges) {
    const list = incoming.get(edge.toId) ?? []
    list.push(edge)
    incoming.set(edge.toId, list)
  }

  track.columns.forEach((column, columnIndex) => {
    const ids = flattenColumn(column)
    if (columnIndex === 0) {
      let y = 0
      for (const group of column.groups) {
        group.matchIds.forEach((id, index) => {
          yById.set(id, y + index * (DIAGRAM_CARD_HEIGHT + DIAGRAM_CARD_GAP))
        })
        y +=
          group.matchIds.length * (DIAGRAM_CARD_HEIGHT + DIAGRAM_CARD_GAP) +
          (column.groups.length > 1 ? 28 : 0)
      }
      resolveOverlaps(ids, yById, DIAGRAM_CARD_GAP)
      return
    }

    const wFed: string[] = []
    const lFed: string[] = []
    for (const id of ids) {
      const edges = incoming.get(id) ?? []
      const hasW = edges.some((edge) => edge.kind === 'W')
      const hasL = edges.some((edge) => edge.kind === 'L')
      if (hasL && !hasW) lFed.push(id)
      else wFed.push(id)
    }

    for (const id of wFed) {
      const parents = (incoming.get(id) ?? [])
        .filter((edge) => edge.kind === 'W')
        .map((edge) => yById.get(edge.fromId))
        .filter((y): y is number => y !== undefined)
      yById.set(id, parents.length > 0 ? average(parents) : 0)
    }
    resolveOverlaps(wFed, yById, DIAGRAM_CARD_GAP)

    const winnerBottom =
      wFed.length > 0
        ? Math.max(...wFed.map((id) => (yById.get(id) ?? 0) + DIAGRAM_CARD_HEIGHT))
        : Math.max(0, ...[...yById.values()].map((y) => y + DIAGRAM_CARD_HEIGHT))

    lFed.forEach((id, index) => {
      const parents = (incoming.get(id) ?? [])
        .filter((edge) => edge.kind === 'L')
        .map((edge) => yById.get(edge.fromId))
        .filter((y): y is number => y !== undefined)
      const preferred = parents.length > 0 ? average(parents) : winnerBottom + DIAGRAM_CARD_GAP
      const stacked = winnerBottom + DIAGRAM_CARD_GAP + index * (DIAGRAM_CARD_HEIGHT + DIAGRAM_CARD_GAP)
      yById.set(id, Math.max(preferred, stacked))
    })
    resolveOverlaps([...wFed, ...lFed], yById, DIAGRAM_CARD_GAP)
  })

  const positions = new Map<string, PlayoffDiagramNodePos>()
  let maxY = 0
  track.columns.forEach((column, columnIndex) => {
    const x = DIAGRAM_PAD_X + columnIndex * (DIAGRAM_CARD_WIDTH + DIAGRAM_COL_GAP)
    for (const id of flattenColumn(column)) {
      const y = DIAGRAM_PAD_Y + (yById.get(id) ?? 0)
      positions.set(id, { matchId: id, column: columnIndex, x, y })
      maxY = Math.max(maxY, y + DIAGRAM_CARD_HEIGHT)
    }
  })

  const width =
    DIAGRAM_PAD_X * 2 +
    Math.max(1, track.columns.length) * DIAGRAM_CARD_WIDTH +
    Math.max(0, track.columns.length - 1) * DIAGRAM_COL_GAP
  const height = maxY + DIAGRAM_PAD_Y

  return { positions, width, height }
}
