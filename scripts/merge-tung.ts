/**
 * One-off: gộp "Tùng YB" → "Tùng" trên mọi event Firestore.
 * Chạy: npx tsx scripts/merge-tung.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initializeApp } from 'firebase/app'
import { collection, getDocs, doc, setDoc, getFirestore } from 'firebase/firestore'

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env')
  const text = readFileSync(envPath, 'utf8')
  const out: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (!m) continue
    out[m[1]!.trim()] = m[2]!.trim()
  }
  return out
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

const OLD_NAMES = ['Tùng YB', 'Tung YB']
const NEW_NAME = 'Tùng'
const OLD_SET = new Set(OLD_NAMES.map(normalizeName))

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
  let participantsRenamed = 0

  for (const item of snap.docs) {
    const data = item.data() as {
      participants?: Array<{ id: string; name: string; clubPlayerId?: string; skillLevel?: number }>
    }
    if (!Array.isArray(data.participants)) continue

    let changed = false
    const participants = data.participants.map((p) => {
      if (!OLD_SET.has(normalizeName(p.name))) return p
      changed = true
      participantsRenamed++
      return { ...p, name: NEW_NAME }
    })

    if (!changed) continue

    await setDoc(doc(db, 'events', item.id), { ...data, participants })
    eventsUpdated++
    console.log(`Updated event ${item.id}`)
  }

  console.log(
    `Done. Events updated: ${eventsUpdated}. Participants renamed: ${participantsRenamed}.`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
