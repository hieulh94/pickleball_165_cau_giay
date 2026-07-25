import { readFileSync } from 'fs'
import { initializeApp } from 'firebase/app'
import { collection, getDocs, getFirestore } from 'firebase/firestore'

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
const db = getFirestore(app)
const snap = await getDocs(collection(db, 'events'))

for (const item of snap.docs) {
  const data = item.data()
  const playoff = (data.matches || []).filter((m) => m.phase === 'playoff')
  if (playoff.length === 0) continue
  console.log('\n===', item.id, data.name, '===')
  console.log('playoffConfig', JSON.stringify(data.playoffConfig))
  for (const m of playoff) {
    console.log(
      JSON.stringify({
        name: m.name,
        bracket: m.playoffBracket,
        round: m.playoffRound,
        src: [m.pair1Source, m.pair2Source],
        score: [m.score1, m.score2],
        done: m.completed,
        wTo: m.winnerToMatchId,
        lTo: m.loserToMatchId,
      }),
    )
  }
}
