import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  setDoc,
  addDoc,
  updateDoc,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore'
import { getDb } from './firebase'
import type { Usuario, Grupo, Nino, Sabado, Registro, AppConfig } from './types'

export async function getUsuario(uid: string): Promise<Usuario | null> {
  const snap = await getDoc(doc(getDb(), 'usuarios', uid))
  if (!snap.exists()) return null
  return { uid, ...snap.data() } as Usuario
}

export async function getGrupos(): Promise<Grupo[]> {
  const snap = await getDocs(collection(getDb(), 'grupos'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Grupo)
}

export async function getNinosByGrupo(grupoId: string): Promise<Nino[]> {
  const q = query(collection(getDb(), 'ninos'), where('grupoId', '==', grupoId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Nino)
}

export async function getAllNinos(): Promise<Nino[]> {
  const snap = await getDocs(collection(getDb(), 'ninos'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Nino)
}

export async function getAllSabados(): Promise<Sabado[]> {
  const q = query(collection(getDb(), 'sabados'), orderBy('fecha', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Sabado)
}

export async function getRegistrosBySabadoAndNinos(sabadoId: string, ninoIds: string[]): Promise<Registro[]> {
  if (ninoIds.length === 0) return []
  const chunks = chunk(ninoIds, 30)
  const registros: Registro[] = []
  for (const ids of chunks) {
    const q = query(
      collection(getDb(), 'registros'),
      where('sabadoId', '==', sabadoId),
      where('ninoId', 'in', ids)
    )
    const snap = await getDocs(q)
    registros.push(...snap.docs.map(d => ({ id: d.id, ...d.data() }) as Registro))
  }
  return registros
}

export async function getRegistrosBySabado(sabadoId: string): Promise<Registro[]> {
  const q = query(collection(getDb(), 'registros'), where('sabadoId', '==', sabadoId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Registro)
}

export async function getRegistrosByNinos(ninoIds: string[]): Promise<Registro[]> {
  if (ninoIds.length === 0) return []
  const registros: Registro[] = []
  for (const ids of chunk(ninoIds, 30)) {
    const q = query(collection(getDb(), 'registros'), where('ninoId', 'in', ids))
    const snap = await getDocs(q)
    registros.push(...snap.docs.map(d => ({ id: d.id, ...d.data() }) as Registro))
  }
  return registros
}

export async function getAllRegistros(): Promise<Registro[]> {
  const snap = await getDocs(collection(getDb(), 'registros'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Registro)
}

export async function getAppConfig(): Promise<AppConfig> {
  const snap = await getDoc(doc(getDb(), 'config', 'app'))
  if (!snap.exists()) return { añoActivo: new Date().getFullYear(), umbralFidelidadAlerta: 60 }
  return snap.data() as AppConfig
}

export async function setAppConfig(data: Partial<AppConfig>): Promise<void> {
  await setDoc(doc(getDb(), 'config', 'app'), data, { merge: true })
}

export async function addNino(data: Omit<Nino, 'id'>): Promise<string> {
  const ref = await addDoc(collection(getDb(), 'ninos'), data)
  return ref.id
}

export async function updateNino(id: string, data: Partial<Omit<Nino, 'id'>>): Promise<void> {
  await updateDoc(doc(getDb(), 'ninos', id), data)
}

export async function deleteNino(id: string): Promise<void> {
  const registrosSnap = await getDocs(query(collection(getDb(), 'registros'), where('ninoId', '==', id)))
  await deleteRefs([...registrosSnap.docs.map(d => d.ref), doc(getDb(), 'ninos', id)])
}

export async function addSabado(data: Omit<Sabado, 'id'>): Promise<string> {
  const ref = await addDoc(collection(getDb(), 'sabados'), data)
  return ref.id
}

export async function deleteSabado(id: string): Promise<void> {
  const registrosSnap = await getDocs(query(collection(getDb(), 'registros'), where('sabadoId', '==', id)))
  await deleteRefs([...registrosSnap.docs.map(d => d.ref), doc(getDb(), 'sabados', id)])
}

export async function batchSaveRegistros(
  registros: Array<{ ninoId: string; sabadoId: string; vino: boolean; pago: boolean; registradoPor: string }>
): Promise<void> {
  const db = getDb()
  const chunkSize = 450
  for (let i = 0; i < registros.length; i += chunkSize) {
    const batch = writeBatch(db)
    registros.slice(i, i + chunkSize).forEach(r => {
      const ref = doc(db, 'registros', `${r.sabadoId}_${r.ninoId}`)
      batch.set(ref, {
        sabadoId: r.sabadoId,
        ninoId: r.ninoId,
        vino: r.vino,
        pago: r.pago,
        registradoPor: r.registradoPor,
        fechaHora: new Date().toISOString(),
      })
    })
    await batch.commit()
  }
}

export async function getUsuarios(): Promise<Usuario[]> {
  const snap = await getDocs(collection(getDb(), 'usuarios'))
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }) as Usuario)
}

async function deleteRefs(refs: DocumentReference[]): Promise<void> {
  const chunkSize = 450
  for (let i = 0; i < refs.length; i += chunkSize) {
    const batch = writeBatch(getDb())
    refs.slice(i, i + chunkSize).forEach(ref => batch.delete(ref))
    await batch.commit()
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}
