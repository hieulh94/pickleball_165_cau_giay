/**
 * List name variants matching Minh / Ghẹ / Trúc Mai
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initializeApp } from 'firebase/app'
import { collection, getDocs, getFirestore } from 'firebase/firestore'

function loadEnv() {
  const text = readFileSync(resolve(process.cwd(), '.env'), 'utf8')
  const out: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) out[m[1]!.trim()] = m[2]!.trim()
  }
  return out
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
  const names = new Map<string, number>()
  for (const d of snap.docs) {
    const parts = (d.data().participants || []) as { name?: string }[]
    for (const p of parts) {
      const n = (p.name || '').trim()
      if (/minh|ghẹ|ghe|trúc mai|truc mai/i.test(n)) {
        names.set(n, (names.get(n) || 0) + 1)
      }
    }
  }
  console.log([...names.entries()].sort((a, b) => a[0].localeCompare(b[0], 'vi')))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
