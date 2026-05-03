import { cert, getApps, initializeApp, getApp, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function getAdminApp(): App {
  if (getApps().length) return getApp()

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

  if (!clientEmail || !privateKey || !projectId) {
    throw new Error(
      'Missing Firebase Admin credentials. Set FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, and NEXT_PUBLIC_FIREBASE_PROJECT_ID.'
    )
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  })
}

export function getAdminAuth() {
  return getAuth(getAdminApp())
}

export function getAdminDb() {
  return getFirestore(getAdminApp())
}
