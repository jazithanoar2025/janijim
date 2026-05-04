import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { findEscuelaByText } from '@/lib/escuelas'

async function requireSuperadmin(req: NextRequest) {
  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
  if (!token) return null

  const auth = getAdminAuth()
  const db = getAdminDb()
  const decoded = await auth.verifyIdToken(token)
  const profile = await db.doc(`usuarios/${decoded.uid}`).get()
  if (!profile.exists || profile.data()?.rol !== 'superadmin') return null
  return { db }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSuperadmin(req)
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })

    const snap = await session.db.collection('ninos').get()
    let matched = 0
    let skipped = 0
    let pending = session.db.batch()
    let writes = 0

    for (const docSnap of snap.docs) {
      const data = docSnap.data()
      if (data.escuelaId || typeof data.escuela !== 'string' || !data.escuela.trim()) {
        skipped += 1
        continue
      }

      const escuela = findEscuelaByText(data.escuela)
      if (!escuela) {
        skipped += 1
        continue
      }

      pending.update(docSnap.ref, {
        escuela: escuela.nombre,
        escuelaId: escuela.id,
      })
      matched += 1
      writes += 1

      if (writes === 450) {
        await pending.commit()
        pending = session.db.batch()
        writes = 0
      }
    }

    if (writes > 0) await pending.commit()
    return NextResponse.json({ success: true, matched, skipped, total: snap.size })
  } catch (err) {
    console.error('Normalize schools error:', err)
    return NextResponse.json({ error: 'No se pudieron normalizar las escuelas.' }, { status: 500 })
  }
}
