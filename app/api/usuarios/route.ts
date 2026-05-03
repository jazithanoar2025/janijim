import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  try {
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
    const auth = getAdminAuth()
    const db = getAdminDb()
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
