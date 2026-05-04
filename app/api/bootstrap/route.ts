import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'No disponible.' }, { status: 404 })
  }

  const diag: Record<string, unknown> = {
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? '✅ set' : '❌ missing',
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY
      ? `✅ set (${process.env.FIREBASE_PRIVATE_KEY.length} chars)`
      : '❌ missing',
    BOOTSTRAP_SECRET: process.env.BOOTSTRAP_SECRET ? '✅ set' : '❌ missing',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '❌ missing',
  }

  try {
    const auth = getAdminAuth()
    await auth.listUsers(1)
    diag.firebaseAuth = '✅ ok'
  } catch (err) {
    diag.firebaseAuth = `❌ ${String(err)}`
  }

  try {
    const db = getAdminDb()
    await db.doc('config/app').get()
    diag.firestore = '✅ ok'
  } catch (err) {
    diag.firestore = `❌ ${String(err)}`
  }

  return NextResponse.json(diag)
}

export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'No disponible.' }, { status: 404 })
    }

    const { secret, email, password, name } = await req.json() as {
      secret: string
      email: string
      password?: string
      name: string
    }

    const expectedSecret = process.env.BOOTSTRAP_SECRET
    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json({ error: 'Clave inválida.' }, { status: 401 })
    }

    const db = getAdminDb()
    const configSnap = await db.doc('config/app').get()
    if (configSnap.exists) {
      return NextResponse.json({ error: 'Ya está configurado. El superadmin ya existe.' }, { status: 409 })
    }

    const auth = getAdminAuth()
    let uid: string

    try {
      const existing = await auth.getUserByEmail(email)
      uid = existing.uid
    } catch (err: unknown) {
      if ((err as { code?: string }).code !== 'auth/user-not-found') throw err
      if (!password) {
        return NextResponse.json(
          { error: 'El usuario no existe en Firebase Auth. Incluí una contraseña para crearlo.' },
          { status: 400 }
        )
      }
      const newUser = await auth.createUser({ email, password, displayName: name })
      uid = newUser.uid
    }

    const batch = db.batch()
    batch.set(db.doc('config/app'), {
      añoActivo: new Date().getFullYear(),
      umbralFidelidadAlerta: 60,
    })
    batch.set(db.doc(`usuarios/${uid}`), {
      email,
      nombre: name,
      rol: 'superadmin',
      grupoId: null,
    })
    await batch.commit()

    return NextResponse.json({ success: true, uid })
  } catch (err) {
    console.error('Bootstrap error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
