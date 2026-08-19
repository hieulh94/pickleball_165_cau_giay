import {
  applyClubPlayerRatingUpdates,
  DEFAULT_CLUB_PLAYER_GENDER,
  DEFAULT_CLUB_PLAYER_RATING,
  DEFAULT_CLUB_PLAYER_SKILL_LEVEL,
  findClubPlayerById,
  findClubPlayerByName,
  formatGenderSkillLabel,
  getClubPlayers,
  resolveCanonicalPlayerName,
  seedRatingFromSkillLevel,
  type ClubPlayerGender,
} from './clubPlayers'
import { isShowMatch } from './matches'
import { formatParticipantName, normalizeParticipantName } from './showmatchParticipants'
import type { Participant, PickleballEvent, SkillLevel } from '../types'

export const ELO_K_FACTOR = 32
export const ELO_PROMOTE_THRESHOLD = 1050
export const ELO_DEMOTE_THRESHOLD = 950
export const ELO_MIN_MATCHES_FOR_SKILL_CHANGE = 5

export interface PlayerRatingRow {
  key: string
  clubPlayerId?: string
  name: string
  gender: ClubPlayerGender
  rating: number
  matchesRated: number
  skillLevel: SkillLevel
  wins: number
  losses: number
}

export interface EloHistoryEntry {
  eventId: string
  eventName: string
  eventDate: string
  matchId: string
  round: number
  won: boolean
  delta: number
  ratingBefore: number
  ratingAfter: number
  partnerName: string
  opponentNames: string
  /** Trình độ trước trận */
  skillBefore: SkillLevel
  /** Trình độ sau trận (có thể thăng/giáng A↔B) */
  skillAfter: SkillLevel
}

export function didSkillChange(entry: EloHistoryEntry): boolean {
  return entry.skillBefore !== entry.skillAfter
}

export function formatSkillChangeLabel(from: SkillLevel, to: SkillLevel): string {
  if (from === to) return from
  if (from === 'B' && to === 'A') return 'Thăng hạng B → A'
  if (from === 'A' && to === 'B') return 'Xuống hạng A → B'
  return `${from} → ${to}`
}

export interface SkillChangeEvent {
  playerName: string
  clubPlayerId?: string
  from: SkillLevel
  to: SkillLevel
  ratingAfter: number
  eventId: string
  eventName: string
  eventDate: string
  matchId: string
  round: number
}

interface RatingState {
  clubPlayerId?: string
  displayName: string
  gender: ClubPlayerGender
  skillLevel: SkillLevel
  rating: number
  matchesRated: number
  wins: number
  losses: number
}

function isTournamentEvent(event: PickleballEvent): boolean {
  return event.eventType !== 'showmatch'
}

/**
 * Identity Elo: ưu tiên club theo tên chuẩn (alias đã gộp), không tin clubPlayerId cũ
 * (VD vẫn gắn `vk-of-dương-gà` sau khi localStorage đã thành `chị-vân-anh`).
 */
function resolvePlayerIdentity(
  participant: Participant,
  players = getClubPlayers(),
): {
  key: string
  canonicalName: string
  clubPlayerId?: string
  gender: ClubPlayerGender
  skillLevel: SkillLevel
} {
  const canonicalName = resolveCanonicalPlayerName(participant.name)
  const club =
    findClubPlayerByName(canonicalName, players) ??
    (participant.clubPlayerId
      ? findClubPlayerById(participant.clubPlayerId, players)
      : undefined) ??
    findClubPlayerByName(participant.name, players)

  const clubPlayerId = club?.id
  const key = clubPlayerId
    ? `id:${clubPlayerId}`
    : `name:${normalizeParticipantName(canonicalName)}`

  // Ưu tiên trình độ trên club (admin chỉnh A/B) làm seed Elo khi đồng bộ.
  const skillLevel =
    club?.skillLevel ?? participant.skillLevel ?? DEFAULT_CLUB_PLAYER_SKILL_LEVEL

  return {
    key,
    canonicalName,
    clubPlayerId,
    gender: club?.gender ?? DEFAULT_CLUB_PLAYER_GENDER,
    skillLevel,
  }
}

function expectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400))
}

function ensureState(
  map: Map<string, RatingState>,
  participant: Participant,
): RatingState {
  const identity = resolvePlayerIdentity(participant)
  const existing = map.get(identity.key)
  if (existing) {
    if (!existing.clubPlayerId && identity.clubPlayerId) {
      existing.clubPlayerId = identity.clubPlayerId
    }
    return existing
  }

  const state: RatingState = {
    clubPlayerId: identity.clubPlayerId,
    displayName: formatParticipantName(identity.canonicalName),
    gender: identity.gender,
    skillLevel: identity.skillLevel,
    // Prior A/B: A→1100, B→900 — không bắt đầu đồng đều 1000.
    rating: seedRatingFromSkillLevel(identity.skillLevel),
    matchesRated: 0,
    wins: 0,
    losses: 0,
  }
  map.set(identity.key, state)
  return state
}

function applySkillFromRating(state: RatingState): SkillLevel {
  if (state.matchesRated < ELO_MIN_MATCHES_FOR_SKILL_CHANGE) {
    return state.skillLevel
  }
  if (state.rating >= ELO_PROMOTE_THRESHOLD) return 'A'
  if (state.rating <= ELO_DEMOTE_THRESHOLD) return 'B'
  return state.skillLevel
}

/** Skill sau khi cộng delta + 1 trận (không mutate state). */
function peekSkillAfter(state: RatingState, delta: number): SkillLevel {
  return applySkillFromRating({
    ...state,
    rating: state.rating + delta,
    matchesRated: state.matchesRated + 1,
  })
}

/**
 * Replay Elo từ lịch sử mini game (tournament), theo thứ tự thời gian event.
 * Không tính showmatch. Hòa bỏ qua.
 * Nếu `collectForKey` được truyền, ghi lịch sử +/- cho identity đó.
 */
function replayRatings(
  events: PickleballEvent[],
  collectForKey?: string,
): {
  states: Map<string, RatingState>
  history: EloHistoryEntry[]
  skillChanges: SkillChangeEvent[]
} {
  const states = new Map<string, RatingState>()
  const history: EloHistoryEntry[] = []
  const skillChanges: SkillChangeEvent[] = []

  const tournamentEvents = events
    .filter(isTournamentEvent)
    .slice()
    .sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )

  for (const event of tournamentEvents) {
    const participantById = new Map(event.participants.map((p) => [p.id, p]))
    const pairById = new Map(event.pairs.map((p) => [p.id, p]))

    const matches = event.matches
      .filter((m) => m.completed && !isShowMatch(m))
      .slice()
      .sort((a, b) => a.round - b.round || a.court - b.court)

    for (const match of matches) {
      if (
        !match.pair1Id ||
        !match.pair2Id ||
        match.score1 === undefined ||
        match.score2 === undefined ||
        match.score1 === match.score2
      ) {
        continue
      }

      const pair1 = pairById.get(match.pair1Id)
      const pair2 = pairById.get(match.pair2Id)
      if (!pair1 || !pair2) continue

      const team1Players = [pair1.player1Id, pair1.player2Id]
        .map((id) => participantById.get(id))
        .filter((p): p is Participant => !!p)
      const team2Players = [pair2.player1Id, pair2.player2Id]
        .map((id) => participantById.get(id))
        .filter((p): p is Participant => !!p)

      if (team1Players.length < 2 || team2Players.length < 2) continue

      const team1States = team1Players.map((p) => ensureState(states, p))
      const team2States = team2Players.map((p) => ensureState(states, p))

      const rating1 =
        (team1States[0]!.rating + team1States[1]!.rating) / 2
      const rating2 =
        (team2States[0]!.rating + team2States[1]!.rating) / 2

      const team1Won = match.score1 > match.score2
      const s1 = team1Won ? 1 : 0
      const s2 = team1Won ? 0 : 1
      const e1 = expectedScore(rating1, rating2)
      const e2 = expectedScore(rating2, rating1)
      const delta1 = ELO_K_FACTOR * (s1 - e1)
      const delta2 = ELO_K_FACTOR * (s2 - e2)

      const nameOf = (p: Participant) =>
        formatParticipantName(resolveCanonicalPlayerName(p.name))

      if (collectForKey) {
        const recordTeam = (
          players: Participant[],
          teamStates: RatingState[],
          won: boolean,
          delta: number,
          opponents: Participant[],
        ) => {
          for (let i = 0; i < players.length; i++) {
            const state = teamStates[i]!
            const key = resolvePlayerIdentity(players[i]!).key
            if (key !== collectForKey) continue
            const partner = players[1 - i]!
            const before = state.rating
            const after = before + delta
            const skillBefore = state.skillLevel
            const skillAfter = peekSkillAfter(state, delta)
            history.push({
              eventId: event.id,
              eventName: event.name,
              eventDate: event.createdAt,
              matchId: match.id,
              round: match.round,
              won,
              delta,
              ratingBefore: before,
              ratingAfter: after,
              partnerName: nameOf(partner),
              opponentNames: opponents.map(nameOf).join(' & '),
              skillBefore,
              skillAfter,
            })
          }
        }
        recordTeam(team1Players, team1States, team1Won, delta1, team2Players)
        recordTeam(team2Players, team2States, !team1Won, delta2, team1Players)
      }

      const applyTeam = (teamStates: RatingState[], delta: number, won: boolean) => {
        for (const state of teamStates) {
          const skillBefore = state.skillLevel
          state.rating += delta
          state.matchesRated += 1
          if (won) state.wins += 1
          else state.losses += 1
          state.skillLevel = applySkillFromRating(state)
          if (skillBefore !== state.skillLevel) {
            skillChanges.push({
              playerName: state.displayName,
              clubPlayerId: state.clubPlayerId,
              from: skillBefore,
              to: state.skillLevel,
              ratingAfter: Math.round(state.rating),
              eventId: event.id,
              eventName: event.name,
              eventDate: event.createdAt,
              matchId: match.id,
              round: match.round,
            })
          }
        }
      }

      applyTeam(team1States, delta1, team1Won)
      applyTeam(team2States, delta2, !team1Won)
    }
  }

  return { states, history, skillChanges }
}

function resolveHistoryPlayerKey(playerName: string): string {
  const canonical = resolveCanonicalPlayerName(playerName)
  const club = findClubPlayerByName(canonical) ?? findClubPlayerByName(playerName)
  if (club) return `id:${club.id}`
  return `name:${normalizeParticipantName(canonical)}`
}

/**
 * Tính Elo từ lịch sử mini game (tournament), theo thứ tự thời gian event.
 * Không tính showmatch. Hòa bỏ qua.
 */
export function computePlayerRatings(events: PickleballEvent[]): PlayerRatingRow[] {
  const { states } = replayRatings(events)

  return [...states.entries()]
    .map(([key, state]) => ({
      key,
      clubPlayerId: state.clubPlayerId,
      name: state.displayName,
      gender: state.gender,
      rating: Math.round(state.rating),
      matchesRated: state.matchesRated,
      skillLevel: state.skillLevel,
      wins: state.wins,
      losses: state.losses,
    }))
    .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name, 'vi'))
}

/** Lịch sử +/- Elo từng trận mini game của một người (mới nhất trước). */
export function getPlayerEloHistory(
  events: PickleballEvent[],
  playerName: string,
): EloHistoryEntry[] {
  const key = resolveHistoryPlayerKey(playerName)
  const { history } = replayRatings(events, key)
  return history
    .slice()
    .reverse()
    .map((entry) => ({
      ...entry,
      delta: Math.round(entry.delta),
      ratingBefore: Math.round(entry.ratingBefore),
      ratingAfter: Math.round(entry.ratingAfter),
    }))
}

/** Mọi lần đổi hạng A↔B (mới nhất trước). */
export function getSkillRankChanges(events: PickleballEvent[]): SkillChangeEvent[] {
  const { skillChanges } = replayRatings(events)
  return skillChanges
    .filter(
      (change) =>
        (change.from === 'B' && change.to === 'A') ||
        (change.from === 'A' && change.to === 'B'),
    )
    .slice()
    .reverse()
}

/** @deprecated Dùng getSkillRankChanges — giữ alias thăng hạng B→A. */
export function getSkillPromotions(events: PickleballEvent[]): SkillChangeEvent[] {
  return getSkillRankChanges(events).filter(
    (change) => change.from === 'B' && change.to === 'A',
  )
}

/** Tính lại Elo + cập nhật skillLevel club (cùng giới). Trả về số thành viên đổi. */
export function recomputeClubRatingsFromEvents(events: PickleballEvent[]): {
  updated: number
  rows: PlayerRatingRow[]
} {
  const rows = computePlayerRatings(events)
  const updated = applyClubPlayerRatingUpdates(
    rows.map((row) => ({
      id: row.clubPlayerId,
      name: row.name,
      rating: row.rating,
      matchesRated: row.matchesRated,
      skillLevel: row.skillLevel,
    })),
  )
  return { updated, rows }
}

export function getParticipantRating(participant: Participant): number {
  const players = getClubPlayers()
  const identity = resolvePlayerIdentity(participant, players)
  const club = identity.clubPlayerId
    ? findClubPlayerById(identity.clubPlayerId, players)
    : findClubPlayerByName(identity.canonicalName, players)
  return club?.rating ?? seedRatingFromSkillLevel(identity.skillLevel)
}

export function formatParticipantSkillLabel(participant: Participant): string {
  const identity = resolvePlayerIdentity(participant)
  return formatGenderSkillLabel(identity.gender, participant.skillLevel)
}

/** Snapshot rating hiện tại trên club list (không tính lại từ events). */
export function getClubRatingStandings(): PlayerRatingRow[] {
  return getClubPlayers()
    .map((player) => ({
      key: `id:${player.id}`,
      clubPlayerId: player.id,
      name: player.name,
      gender: player.gender ?? DEFAULT_CLUB_PLAYER_GENDER,
      rating: player.rating ?? DEFAULT_CLUB_PLAYER_RATING,
      matchesRated: player.matchesRated ?? 0,
      skillLevel: player.skillLevel ?? DEFAULT_CLUB_PLAYER_SKILL_LEVEL,
      wins: 0,
      losses: 0,
    }))
    .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name, 'vi'))
}
