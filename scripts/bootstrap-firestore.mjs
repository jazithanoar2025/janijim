import { readFileSync } from 'node:fs'
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function readEnvFile(path) {
  try {
    return Object.fromEntries(
      readFileSync(path, 'utf8')
        .split(/\r?\n/)
        .filter(line => line && !line.trim().startsWith('#'))
        .map(line => {
          const idx = line.indexOf('=')
          return [line.slice(0, idx), line.slice(idx + 1)]
        })
    )
  } catch {
    return {}
  }
}

function parseArgs() {
  const args = new Map()
  for (let i = 2; i < process.argv.length; i += 1) {
    const arg = process.argv[i]
    if (!arg.startsWith('--')) continue
    const [key, inlineValue] = arg.slice(2).split('=', 2)
    const nextValue = process.argv[i + 1]
    if (inlineValue !== undefined) {
      args.set(key, inlineValue)
    } else if (nextValue && !nextValue.startsWith('--')) {
      args.set(key, nextValue)
      i += 1
    } else {
      args.set(key, 'true')
    }
  }
  return args
}

function required(args, key) {
  const value = args.get(key)
  if (!value) throw new Error(`Missing required --${key}`)
  return value
}

function initAdmin(projectId, serviceAccountPath) {
  if (serviceAccountPath) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
    return initializeApp({
      credential: cert(serviceAccount),
      projectId,
    })
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId,
  })
}

function parseGroups(rawGroups) {
  if (!rawGroups) return [{ id: 'rivera', nombre: 'Rivera' }]
  return rawGroups.split(',').map(item => {
    const [id, nombre] = item.split(':')
    if (!id || !nombre) {
      throw new Error('Groups must use --groups id:Nombre,id2:Nombre2')
    }
    return { id, nombre }
  })
}

async function resolveSuperadmin(args) {
  const uid = args.get('superadmin-uid')
  const email = required(args, 'superadmin-email')
  const name = args.get('superadmin-name') ?? 'Superadmin'
  const auth = getAuth()

  if (uid) {
    await auth.setCustomUserClaims(uid, { rol: 'superadmin', grupoId: null })
    return { uid, email, name }
  }

  try {
    const user = await auth.getUserByEmail(email)
    await auth.setCustomUserClaims(user.uid, { rol: 'superadmin', grupoId: null })
    return { uid: user.uid, email, name }
  } catch (err) {
    if (err?.code !== 'auth/user-not-found') throw err
  }

  const password = required(args, 'superadmin-password')
  const user = await auth.createUser({
    email,
    password,
    displayName: name,
  })
  await auth.setCustomUserClaims(user.uid, { rol: 'superadmin', grupoId: null })
  return { uid: user.uid, email, name }
}

const args = parseArgs()
if (args.has('help')) {
  console.log(`
Usage:
  npm run bootstrap:firestore -- \\
    --service-account /path/to/serviceAccount.json \\
    --superadmin-email admin@example.com \\
    --superadmin-password "temporary-password" \\
    --superadmin-name "Admin" \\
    --groups rivera:Rivera

If the Auth user already exists, --superadmin-password is not needed.
If you already know the Firebase Auth UID, pass --superadmin-uid instead.
  `.trim())
  process.exit(0)
}

const env = readEnvFile('.env.local')
const projectId = args.get('project-id') ?? env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

if (!projectId) {
  throw new Error('Missing Firebase project id. Pass --project-id or set NEXT_PUBLIC_FIREBASE_PROJECT_ID.')
}

const activeYear = Number(args.get('active-year') ?? new Date().getFullYear())
const threshold = Number(args.get('threshold') ?? 60)
const serviceAccountPath = args.get('service-account')
const groups = parseGroups(args.get('groups'))

if (!Number.isInteger(activeYear) || activeYear < 2000 || activeYear > 2100) {
  throw new Error('--active-year must be an integer between 2000 and 2100')
}

if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
  throw new Error('--threshold must be between 0 and 100')
}

initAdmin(projectId, serviceAccountPath)
const superadmin = await resolveSuperadmin(args)
const db = getFirestore()
const batch = db.batch()

batch.set(db.doc('config/app'), {
  añoActivo: activeYear,
  umbralFidelidadAlerta: threshold,
}, { merge: true })

batch.set(db.doc(`usuarios/${superadmin.uid}`), {
  email: superadmin.email,
  nombre: superadmin.name,
  rol: 'superadmin',
  grupoId: null,
}, { merge: true })

for (const group of groups) {
  batch.set(db.doc(`grupos/${group.id}`), {
    nombre: group.nombre,
  }, { merge: true })
}

await batch.commit()

console.log(`Bootstrapped Firestore project ${projectId}`)
console.log(`- config/app`)
console.log(`- usuarios/${superadmin.uid}`)
for (const group of groups) {
  console.log(`- grupos/${group.id}`)
}
