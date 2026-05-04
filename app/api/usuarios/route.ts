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

    let newUser
    try {
      newUser = await auth.getUserByEmail(email)
      await auth.updateUser(newUser.uid, { password, displayName: nombre, disabled: false })
    } catch (err: unknown) {
      if ((err as { code?: string }).code !== 'auth/user-not-found') throw err
      newUser = await auth.createUser({ email, password, displayName: nombre })
    }

    await db.doc(`usuarios/${newUser.uid}`).set({
      email,
      nombre,
      rol: 'admin',
      grupoId,
    }, { merge: true })

    await db.doc(`grupos/${grupoId}`).update({ adminUid: newUser.uid })

    return NextResponse.json({ success: true, uid: newUser.uid })
  } catch (err) {
    console.error('Create user error:', err)
    return NextResponse.json({ error: 'No se pudo crear o reparar el usuario.' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireSuperadmin(req)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
    }

    const { auth, db } = session
    const [usuariosSnap, groupsSnap] = await Promise.all([
      db.collection('usuarios').get(),
      db.collection('grupos').get(),
    ])
    const usuarios = await Promise.all(usuariosSnap.docs.map(async docSnap => {
      const data = docSnap.data()
      try {
        const authUser = await auth.getUser(docSnap.id)
        return {
          uid: docSnap.id,
          ...data,
          authStatus: 'ok',
          disabled: authUser.disabled,
          lastSignInTime: authUser.metadata.lastSignInTime ?? null,
        }
      } catch (err: unknown) {
        return {
          uid: docSnap.id,
          ...data,
          authStatus: (err as { code?: string }).code === 'auth/user-not-found' ? 'missing-auth' : 'error',
          disabled: null,
          lastSignInTime: null,
        }
      }
    }))

    return NextResponse.json({
      usuarios,
      grupos: groupsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })),
    })
  } catch (err) {
    console.error('List users error:', err)
    return NextResponse.json({ error: 'No se pudieron cargar los usuarios.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSuperadmin(req)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
    }

    const { uid, password, disabled, nombre, grupoId } = await req.json() as {
      uid: string
      password?: string
      disabled?: boolean
      nombre?: string
      grupoId?: string
    }

    if (!uid) return NextResponse.json({ error: 'Falta uid.' }, { status: 400 })
    const { auth, db } = session
    if (grupoId) {
      const groupSnap = await db.doc(`grupos/${grupoId}`).get()
      if (!groupSnap.exists) {
        return NextResponse.json({ error: 'La kvutza no existe.' }, { status: 400 })
      }
    }

    const updateAuth: { password?: string; disabled?: boolean; displayName?: string } = {}
    if (password) updateAuth.password = password
    if (typeof disabled === 'boolean') updateAuth.disabled = disabled
    if (nombre) updateAuth.displayName = nombre
    if (Object.keys(updateAuth).length > 0) await auth.updateUser(uid, updateAuth)

    const updateProfile: Record<string, string | boolean> = {}
    if (nombre) updateProfile.nombre = nombre
    if (grupoId) updateProfile.grupoId = grupoId
    if (Object.keys(updateProfile).length > 0) await db.doc(`usuarios/${uid}`).set(updateProfile, { merge: true })
    if (grupoId) await db.doc(`grupos/${grupoId}`).set({ adminUid: uid }, { merge: true })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Update user error:', err)
    return NextResponse.json({ error: 'No se pudo actualizar el usuario.' }, { status: 500 })
  }
}
