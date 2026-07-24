export type SkillLevel = 1 | 2

export interface Participant {
  id: string
  name: string
  skillLevel: SkillLevel
  isManualEntry?: boolean
  /** Liên kết danh sách CLB — dùng đồng bộ đổi tên */
  clubPlayerId?: string
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

export type PlayoffBracketKind = 'championship' | 'placement'

export type PlayoffConfigStatus = 'configured' | 'generated'

export interface ShowmatchGame {
  score1: number
  score2: number
}

export interface PlayoffConfig {
  /** Số hạng đầu mỗi bảng vào nhánh tranh giải */
  championshipSlotsPerGroup: number
  /** Số hạng còn lại mỗi bảng vào nhánh tranh thứ hạng */
  placementSlotsPerGroup: number
  status?: PlayoffConfigStatus
}

export interface Match {
  id: string
  /** null = chờ đội (TBD) — chỉ playoff bracket tự động */
  pair1Id: string | null
  pair2Id: string | null
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
  /** Nhánh playoff tự động */
  playoffBracket?: PlayoffBracketKind
  /** Thứ tự vòng trong bracket (1 = vòng đầu) */
  playoffRound?: number
  /** Slot seed hiển thị: "A1", "B2", "W:…", "L:…" */
  pair1Source?: string
  pair2Source?: string
  /** Khi xong: điền winner/loser vào trận đích */
  winnerToMatchId?: string
  winnerToSlot?: 1 | 2
  loserToMatchId?: string
  loserToSlot?: 1 | 2
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
  /** Chốt danh sách — không thêm/xóa người tham gia */
  participantsLocked?: boolean
  /** Chốt ghép cặp — không random/ghép tay */
  pairsLocked?: boolean
  /** Chốt phân bảng — không đổi bảng đấu */
  groupsLocked?: boolean
  /** Chốt lịch vòng bảng — không thêm/xóa sân hay thay đổi lịch */
  scheduleLocked?: boolean
  courts: number[]
  matches: Match[]
  /** Cấu hình tự tạo bracket playoff từ BXH */
  playoffConfig?: PlayoffConfig
  /** Số beer cống hiến từng người (participantId → amount) — mini game, dùng cho BXH */
  participantContributions?: Record<string, number>
}
