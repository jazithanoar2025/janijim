import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

function getFirebaseConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

  if (!apiKey || !authDomain || !projectId) {
    throw new Error(
      'Missing required Firebase environment variables: NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID'
    )
  }

  return {
    apiKey,
    authDomain,
    projectId,
    ...(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET && {
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    }),
    ...(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID && {
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    }),
    ...(process.env.NEXT_PUBLIC_FIREBASE_APP_ID && {
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }),
  }
}

function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(getFirebaseConfig())
}

export function getDb() {
  return getFirestore(getFirebaseApp())
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp())
}
