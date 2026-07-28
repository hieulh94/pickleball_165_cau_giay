/**
 * Rà soát có ai thăng/giáng A↔B từ Elo chưa.
 * Chạy: npx tsx scripts/check-skill-changes.ts
 *
 * Logic Elo khớp src/lib/playerRating.ts (K=24, promote 1100, demote 900, min 5 trận).
 * Seed: A→1100, B→900 theo skill participant lần đầu gặp (không đọc localStorage browser).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initializeApp } from 'firebase/app'
import { collection, getDocs, getFirestore } from 'firebase/firestore'

const ELO_K_FACTOR = 32
const ELO_PROMOTE_THRESHOLD = 1050
const ELO_DEMOTE_THRESHOLD = 950
const ELO_MIN_MATCHES_FOR_SKILL_CHANGE = 5
const ELO_SEED_A = 1100
const ELO_SEED_B = 900

type Skill = 'A' | 'B'

function loadEnv() {
  const text = readFileSync(resolve(process.cwd(), '.env'), 'utf8')
  const out: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) out[m[1]!.trim()] = m[2]!.trim()
  }
  return out
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

function migrateSkill(value: unknown): Skill {
  if (value === 'A' || value === 'B') return value
  if (value === 2 || value === '2') return 'A'
  if (value === 1 || value === '1') return 'B'
  return 'B'
}

function seedRating(skill: Skill): number {
  return skill === 'A' ? ELO_SEED_A : ELO_SEED_B
}

function expectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400))
}

function applySkill(skill: Skill, rating: number, matchesRated: number): Skill {
  if (matchesRated < ELO_MIN_MATCHES_FOR_SKILL_CHANGE) return skill
  if (rating >= ELO_PROMOTE_THRESHOLD) return 'A'
  if (rating <= ELO_DEMOTE_THRESHOLD) return 'B'
  return skill
}

interface PlayerState {
  name: string
  skill: Skill
  rating: number
  matches: number
  wins: number
  losses: number
}

interface SkillChange {
  name: string
  from: Skill
  to: Skill
  ratingAfter: number
  eventName: string
  eventDate: string
}

async function main() {
  const env = loadEnv()
  initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  })

  const db = getFirestore()
  const snap = await getDocs(collection(db, 'events'))
  const events = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }))

  const tournaments = events
    .filter((e) => e.eventType !== 'showmatch')
    .slice()
    .sort(
      (a, b) =>
        new Date(String(a.createdAt ?? 0)).getTime() -
        new Date(String(b.createdAt ?? 0)).getTime(),
    )

  let completedCount = 0
  const states = new Map<string, PlayerState>()
  const skillChanges: SkillChange[] = []

  const ensure = (participant: {
    id: string
    name: string
    skillLevel?: unknown
  }): PlayerState => {
    const key = normalizeName(participant.name)
    const existing = states.get(key)
    if (existing) return existing
    const skill = migrateSkill(participant.skillLevel)
    const state: PlayerState = {
      name: participant.name.trim().replace(/\s+/g, ' '),
      skill,
      rating: seedRating(skill),
      matches: 0,
      wins: 0,
      losses: 0,
    }
    states.set(key, state)
    return state
  }

  for (const event of tournaments) {
    const participants = (event.participants ?? []) as Array<{
      id: string
      name: string
      skillLevel?: unknown
    }>
    const pairs = (event.pairs ?? []) as Array<{
      id: string
      player1Id: string
      player2Id: string
    }>
    const matches = (
      (event.matches ?? []) as Array<{
        id: string
        pair1Id?: string | null
        pair2Id?: string | null
        score1?: number
        score2?: number
        completed?: boolean
        phase?: string
        round?: number
        court?: number
      }>
    )
      .filter((m) => m.completed && m.phase !== 'showmatch')
      .slice()
      .sort((a, b) => (a.round ?? 0) - (b.round ?? 0) || (a.court ?? 0) - (b.court ?? 0))

    const participantById = new Map(participants.map((p) => [p.id, p]))
    const pairById = new Map(pairs.map((p) => [p.id, p]))

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
      completedCount++

      const pair1 = pairById.get(match.pair1Id)
      const pair2 = pairById.get(match.pair2Id)
      if (!pair1 || !pair2) continue

      const team1 = [pair1.player1Id, pair1.player2Id]
        .map((id) => participantById.get(id))
        .filter(Boolean) as Array<{ id: string; name: string; skillLevel?: unknown }>
      const team2 = [pair2.player1Id, pair2.player2Id]
        .map((id) => participantById.get(id))
        .filter(Boolean) as Array<{ id: string; name: string; skillLevel?: unknown }>
      if (team1.length < 2 || team2.length < 2) continue

      const s1 = team1.map(ensure)
      const s2 = team2.map(ensure)
      const rating1 = (s1[0]!.rating + s1[1]!.rating) / 2
      const rating2 = (s2[0]!.rating + s2[1]!.rating) / 2
      const team1Won = match.score1 > match.score2
      const delta1 = ELO_K_FACTOR * ((team1Won ? 1 : 0) - expectedScore(rating1, rating2))
      const delta2 = ELO_K_FACTOR * ((team1Won ? 0 : 1) - expectedScore(rating2, rating1))

      const applyTeam = (teamStates: PlayerState[], delta: number, won: boolean) => {
        for (const state of teamStates) {
          const from = state.skill
          state.rating += delta
          state.matches += 1
          if (won) state.wins += 1
          else state.losses += 1
          state.skill = applySkill(state.skill, state.rating, state.matches)
          if (from !== state.skill) {
            skillChanges.push({
              name: state.name,
              from,
              to: state.skill,
              ratingAfter: Math.round(state.rating),
              eventName: String(event.name ?? event.id),
              eventDate: String(event.createdAt ?? ''),
            })
          }
        }
      }

      applyTeam(s1, delta1, team1Won)
      applyTeam(s2, delta2, !team1Won)
    }
  }

  const ranked = [...states.values()]
    .filter((p) => p.matches > 0)
    .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name, 'vi'))

  console.log('--- Tổng quan ---')
  console.log({
    events: events.length,
    tournaments: tournaments.length,
    ratedMatches: completedCount,
    playersWithMatches: ranked.length,
    promoteAt: ELO_PROMOTE_THRESHOLD,
    demoteAt: ELO_DEMOTE_THRESHOLD,
    minMatches: ELO_MIN_MATCHES_FOR_SKILL_CHANGE,
    K: ELO_K_FACTOR,
    seed: { A: ELO_SEED_A, B: ELO_SEED_B },
  })

  console.log('\n--- Elo hiện tại (seed theo skill lúc vào event) ---')
  for (const p of ranked) {
    let note = ''
    if (p.matches < ELO_MIN_MATCHES_FOR_SKILL_CHANGE) {
      note = `chưa đủ ${ELO_MIN_MATCHES_FOR_SKILL_CHANGE} trận`
    } else if (p.skill === 'B') {
      const need = ELO_PROMOTE_THRESHOLD - Math.round(p.rating)
      note = need > 0 ? `còn +${need} lên A` : 'ĐỦ lên A'
    } else {
      const need = Math.round(p.rating) - ELO_DEMOTE_THRESHOLD
      note = need > 0 ? `còn −${need} xuống B` : 'ĐỦ xuống B'
    }
    console.log(
      `${String(Math.round(p.rating)).padStart(4)}  ${p.skill}  m=${String(p.matches).padStart(2)}  W${p.wins}-L${p.losses}  ${p.name}  (${note})`,
    )
  }

  console.log('\n--- Thăng/giáng A↔B ---')
  if (skillChanges.length === 0) {
    console.log('Chưa có ai đổi hạng A↔B với ngưỡng hiện tại.')
  } else {
    for (const c of skillChanges) {
      console.log(
        `${c.name}: ${c.from}→${c.to} @${c.ratingAfter} · ${c.eventName} (${c.eventDate.slice(0, 10)})`,
      )
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
