export type SkillLevel = 1 | 2

export interface Participant {
  id: string
  name: string
  skillLevel: SkillLevel
  isManualEntry?: boolean
}

export interface Pair {
  id: string
  player1Id: string
  player2Id: string
  group?: string
  locked?: boolean
  isManual?: boolean
}

export type MatchPhase = 'group' | 'playoff' | 'showmatch'

export type ShowmatchFormat = 'best_of_3'

export interface ShowmatchGame {
  score1: number
  score2: number
}

export interface Match {
  id: string
  pair1Id: string
  pair2Id: string
  round: number
  court: number
  group?: string
  /** Vòng bảng (mặc định), playoff hoặc showmatch — playoff/showmatch không tính vào BXH */
  phase?: MatchPhase
  /** Tên trận playoff/showmatch */
  name?: string
  /** Thời gian đấu (ISO 8601) — dùng cho showmatch */
  scheduledAt?: string
  /** Bo3 (chạm 2) — chỉ showmatch */
  showmatchFormat?: ShowmatchFormat
  /** Điểm từng ván — chỉ showmatch Bo3 */
  games?: ShowmatchGame[]
  /** Số ván thắng (Bo3) hoặc điểm ván đơn (legacy) */
  score1?: number
  score2?: number
  completed: boolean
  /** Beer cống hiến từng người trong trận (participantId → amount) — showmatch */
  participantContributions?: Record<string, number>
}

export type EventType = 'tournament' | 'showmatch'

export interface PickleballEvent {
  id: string
  name: string
  accessCode: string
  accessPassword: string
  createdAt: string
  /** Mini game (mặc định) hoặc showmatch tuần */
  eventType?: EventType
  participants: Participant[]
  pairs: Pair[]
  splitGroups: boolean
  /** Số bảng khi bật chia bảng (2–26) */
  groupCount?: number
  courts: number[]
  matches: Match[]
  /** Số beer cống hiến từng người (participantId → amount) — mini game, dùng cho BXH */
  participantContributions?: Record<string, number>
}
