/**
 * Migrate participant.skillLevel: 2 → A (mạnh), 1 → B (yếu).
 * Chạy: npx tsx scripts/migrate-skill-levels.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initializeApp } from 'firebase/app'
import { collection, doc, getDocs, getFirestore, setDoc } from 'firebase/firestore'

function loadEnv() {
  const text = readFileSync(resolve(process.cwd(), '.env'), 'utf8')
  const out: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) out[m[1]!.trim()] = m[2]!.trim()
  }
  return out
}

function migrateSkill(value: unknown): 'A' | 'B' {
  if (value === 'A' || value === 'B') return value
  if (value === 2 || value === '2') return 'A'
  if (value === 1 || value === '1') return 'B'
  return 'B'
}

function removeUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = { ...obj }
  for (const key of Object.keys(out)) {
    if (out[key] === undefined) delete out[key]
  }
  return out as T
}

async function main() {
  const env = loadEnv()
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

  let eventsUpdated = 0
  let participantsUpdated = 0

  for (const d of snap.docs) {
    const data = d.data() as {
      participants?: Array<{ skillLevel?: unknown; [k: string]: unknown }>
      [k: string]: unknown
    }
    if (!Array.isArray(data.participants)) continue

    let changed = false
    const participants = data.participants.map((p) => {
      const next = migrateSkill(p.skillLevel)
      if (p.skillLevel === next) return p
      changed = true
      participantsUpdated++
      return { ...p, skillLevel: next }
    })

    if (!changed) continue
    await setDoc(doc(db, 'events', d.id), removeUndefined({ ...data, participants }))
    eventsUpdated++
    console.log('Updated', d.id)
  }

  console.log({ eventsUpdated, participantsUpdated })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
