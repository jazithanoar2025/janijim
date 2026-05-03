import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'

async function requireSuperadmin(req: NextRequest) {
  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
  if (!token) return null

  const auth = getAdminAuth()
  const db = getAdminDb()
  const decoded = await auth.verifyIdToken(token)
  const profile = await db.doc(`usuarios/${decoded.uid}`).get()
  if (!profile.exists || profile.data()?.rol !== 'superadmin') return null
  return { auth, db, uid: decoded.uid }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSuperadmin(req)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
    }

    const { username, nombre, password, grupoId } = await req.json() as {
      username: string
      nombre: string
      password: string
      grupoId: string
    }

    if (!username || !nombre || !password || !grupoId) {
      return NextResponse.json({ error: 'Faltan campos requeridos.' }, { status: 400 })
    }

    const email = username.includes('@') ? username : `${username}@jazit.local`
    const { auth, db } = session
    const groupSnap = await db.doc(`grupos/${grupoId}`).get()
    if (!groupSnap.exists) {
      return NextResponse.json({ error: 'La kvutza no existe.' }, { status: 400 })
    }

    const newUser = await auth.createUser({ email, password, displayName: nombre })

    await db.doc(`usuarios/${newUser.uid}`).set({
      email,
      nombre,
      rol: 'admin',
      grupoId,
    })

    await db.doc(`grupos/${grupoId}`).update({ adminUid: newUser.uid })

    return NextResponse.json({ success: true, uid: newUser.uid })
  } catch (err) {
    console.error('Create user error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
