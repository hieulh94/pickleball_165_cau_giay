export type SkillLevel = 1 | 2

export interface Participant {
  id: string
  name: string
  skillLevel: SkillLevel
}

export interface Pair {
  id: string
  player1Id: string
  player2Id: string
  group?: string
}

export interface Match {
  id: string
  pair1Id: string
  pair2Id: string
  round: number
  court: number
  group?: string
  score1?: number
  score2?: number
  completed: boolean
}

export interface PickleballEvent {
  id: string
  name: string
  createdAt: string
  participants: Participant[]
  pairs: Pair[]
  splitGroups: boolean
  courts: number[]
  matches: Match[]
}
