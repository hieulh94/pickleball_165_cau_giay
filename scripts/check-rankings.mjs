import { readFileSync } from 'fs'
import { initializeApp } from 'firebase/app'
import { collection, getDocs, getFirestore } from 'firebase/firestore'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
})

function getPlaceRangeFromMatchName(name) {
  if (!name) return null
  if (name.trim() === 'Chung kết') return { low: 1, high: 2 }
  const match = name.match(/Tranh hạng\s+(\d+)\s*[-–]\s*(\d+)/i)
  if (!match) return null
  const a = parseInt(match[1], 10)
  const b = parseInt(match[2], 10)
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return null
  return { low: Math.min(a, b), high: Math.max(a, b) }
}

function getMatchWinnerLoser(match) {
  if (!match.completed || match.score1 === undefined || match.score2 === undefined || !match.pair1Id || !match.pair2Id) return null
  if (match.score1 === match.score2) return null
  if (match.score1 > match.score2) return { winnerId: match.pair1Id, loserId: match.pair2Id }
  return { winnerId: match.pair2Id, loserId: match.pair1Id }
}

const db = getFirestore(app)
const snap = await getDocs(collection(db, 'events'))
const ev = snap.docs.find((d) => d.id === 'f890e318-35ec-41db-9b61-18b804d6e585')
const data = ev.data()
const placeByPair = new Map()
for (const match of data.matches) {
  if (match.phase !== 'playoff' || !match.playoffBracket || !match.completed) continue
  const range = getPlaceRangeFromMatchName(match.name)
  if (!range) continue
  const result = getMatchWinnerLoser(match)
  if (!result) continue
  placeByPair.set(result.winnerId, range.low)
  placeByPair.set(result.loserId, range.high)
}
const pairs = Object.fromEntries((data.pairs || []).map((p) => [p.id, p]))
const participants = Object.fromEntries((data.participants || []).map((p) => [p.id, p.name]))
const rankings = [...placeByPair.entries()]
  .map(([pairId, place]) => ({ place, pairId }))
  .sort((a, b) => a.place - b.place)

for (const r of rankings) {
  const pair = pairs[r.pairId]
  const names = pair
    ? [participants[pair.player1Id], participants[pair.player2Id]].filter(Boolean).join(' / ')
    : r.pairId
  console.log(`${r.place}. ${names}`)
}
console.log('total', rankings.length)
