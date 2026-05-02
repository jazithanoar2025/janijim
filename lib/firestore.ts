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
import type { Usuario, Grupo, Janij, Sabado, RegistroAsistencia, AppConfig } from './types'

export async function getUsuario(uid: string): Promise<Usuario | null> {
  const snap = await getDoc(doc(getDb(), 'usuarios', uid))
  if (!snap.exists()) return null
  return { uid, ...snap.data() } as Usuario
}

export async function getGrupos(): Promise<Grupo[]> {
  const snap = await getDocs(collection(getDb(), 'grupos'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Grupo)
}

export async function getJanijimByGrupo(grupoId: string): Promise<Janij[]> {
  const q = query(collection(getDb(), 'janijim'), where('grupoId', '==', grupoId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Janij)
}

export async function getAllJanijim(): Promise<Janij[]> {
  const snap = await getDocs(collection(getDb(), 'janijim'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Janij)
}

export async function getSabadosByGrupo(grupoId: string): Promise<Sabado[]> {
  const q = query(
    collection(getDb(), 'sabados'),
    where('grupoId', '==', grupoId),
    orderBy('fecha', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Sabado)
}

export async function getAsistenciaBySabado(sabadoId: string): Promise<RegistroAsistencia[]> {
  const q = query(collection(getDb(), 'asistencia'), where('sabadoId', '==', sabadoId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as RegistroAsistencia)
}

export async function getAsistenciaByGrupo(grupoId: string): Promise<RegistroAsistencia[]> {
  const q = query(collection(getDb(), 'asistencia'), where('grupoId', '==', grupoId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as RegistroAsistencia)
}

export async function getAppConfig(): Promise<AppConfig> {
  const snap = await getDoc(doc(getDb(), 'config', 'app'))
  if (!snap.exists()) return { añoActivo: new Date().getFullYear(), umbralFidelidadAlerta: 60 }
  return snap.data() as AppConfig
}

export async function setAppConfig(config: Partial<AppConfig>): Promise<void> {
  await setDoc(doc(getDb(), 'config', 'app'), config, { merge: true })
}

async function deleteRefs(refs: DocumentReference[]): Promise<void> {
  const chunkSize = 450
  for (let i = 0; i < refs.length; i += chunkSize) {
    const batch = writeBatch(getDb())
    refs.slice(i, i + chunkSize).forEach(ref => batch.delete(ref))
    await batch.commit()
  }
}

export async function addJanij(data: Omit<Janij, 'id'>): Promise<string> {
  const ref = await addDoc(collection(getDb(), 'janijim'), data)
  return ref.id
}

export async function updateJanij(id: string, data: Partial<Omit<Janij, 'id'>>): Promise<void> {
  await updateDoc(doc(getDb(), 'janijim', id), data)
}

export async function deleteJanij(id: string): Promise<void> {
  const asistenciaSnap = await getDocs(query(collection(getDb(), 'asistencia'), where('janijId', '==', id)))
  await deleteRefs([...asistenciaSnap.docs.map(d => d.ref), doc(getDb(), 'janijim', id)])
}

export async function addSabado(data: Omit<Sabado, 'id'>): Promise<string> {
  const ref = await addDoc(collection(getDb(), 'sabados'), data)
  return ref.id
}

export async function deleteSabado(id: string): Promise<void> {
  const asistenciaSnap = await getDocs(query(collection(getDb(), 'asistencia'), where('sabadoId', '==', id)))
  await deleteRefs([...asistenciaSnap.docs.map(d => d.ref), doc(getDb(), 'sabados', id)])
}

// Composite key sabadoId_janijId makes saves idempotent
export async function batchSaveAsistencia(
  registros: Omit<RegistroAsistencia, 'id'>[]
): Promise<void> {
  await Promise.all(
    registros.map(r =>
      setDoc(doc(getDb(), 'asistencia', `${r.sabadoId}_${r.janijId}`), r)
    )
  )
}

export async function getAllSabados(): Promise<Sabado[]> {
  const q = query(collection(getDb(), 'sabados'), orderBy('fecha', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Sabado)
}

export async function getAllAsistencia(): Promise<RegistroAsistencia[]> {
  const snap = await getDocs(collection(getDb(), 'asistencia'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as RegistroAsistencia)
}
