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

export type MatchPhase = 'group' | 'playoff'

export interface Match {
  id: string
  pair1Id: string
  pair2Id: string
  round: number
  court: number
  group?: string
  /** Vòng bảng (mặc định) hoặc vòng loại trực tiếp — trận playoff không tính vào BXH */
  phase?: MatchPhase
  /** Tên trận playoff: Tứ kết, Bán kết, Chung kết... */
  name?: string
  score1?: number
  score2?: number
  completed: boolean
}

export interface PickleballEvent {
  id: string
  name: string
  accessCode: string
  accessPassword: string
  createdAt: string
  participants: Participant[]
  pairs: Pair[]
  splitGroups: boolean
  courts: number[]
  matches: Match[]
}
