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
  deleteDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Usuario, Grupo, Janij, Sabado, RegistroAsistencia, AppConfig, StatsHistorico } from './types'

export async function getUsuario(uid: string): Promise<Usuario | null> {
  const snap = await getDoc(doc(db, 'usuarios', uid))
  if (!snap.exists()) return null
  return { uid, ...snap.data() } as Usuario
}

export async function getGrupos(): Promise<Grupo[]> {
  const snap = await getDocs(collection(db, 'grupos'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Grupo)
}

export async function getJanijimByGrupo(grupoId: string): Promise<Janij[]> {
  const q = query(collection(db, 'janijim'), where('grupoId', '==', grupoId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Janij)
}

export async function getAllJanijim(): Promise<Janij[]> {
  const snap = await getDocs(collection(db, 'janijim'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Janij)
}

export async function getSabadosByGrupo(grupoId: string): Promise<Sabado[]> {
  const q = query(
    collection(db, 'sabados'),
    where('grupoId', '==', grupoId),
    orderBy('fecha', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Sabado)
}

export async function getAsistenciaBySabado(sabadoId: string): Promise<RegistroAsistencia[]> {
  const q = query(collection(db, 'asistencia'), where('sabadoId', '==', sabadoId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as RegistroAsistencia)
}

export async function getAsistenciaByGrupo(grupoId: string): Promise<RegistroAsistencia[]> {
  const q = query(collection(db, 'asistencia'), where('grupoId', '==', grupoId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as RegistroAsistencia)
}

export async function getAppConfig(): Promise<AppConfig> {
  const snap = await getDoc(doc(db, 'config', 'app'))
  if (!snap.exists()) return { añoActivo: new Date().getFullYear(), umbralFidelidadAlerta: 60 }
  return snap.data() as AppConfig
}

export async function setAppConfig(config: Partial<AppConfig>): Promise<void> {
  await setDoc(doc(db, 'config', 'app'), config, { merge: true })
}

export async function getHistorico(año: number): Promise<StatsHistorico | null> {
  const snap = await getDoc(doc(db, 'historico', String(año)))
  if (!snap.exists()) return null
  return snap.data() as StatsHistorico
}

export async function saveHistorico(stats: StatsHistorico): Promise<void> {
  await setDoc(doc(db, 'historico', String(stats.año)), stats)
}

export async function addJanij(data: Omit<Janij, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'janijim'), data)
  return ref.id
}

export async function updateJanij(id: string, data: Partial<Omit<Janij, 'id'>>): Promise<void> {
  await updateDoc(doc(db, 'janijim', id), data)
}

export async function deleteJanij(id: string): Promise<void> {
  await deleteDoc(doc(db, 'janijim', id))
}

export async function addSabado(data: Omit<Sabado, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'sabados'), data)
  return ref.id
}

export async function deleteSabado(id: string): Promise<void> {
  await deleteDoc(doc(db, 'sabados', id))
}

// Composite key sabadoId_janijId makes saves idempotent
export async function batchSaveAsistencia(
  registros: Omit<RegistroAsistencia, 'id'>[]
): Promise<void> {
  await Promise.all(
    registros.map(r =>
      setDoc(doc(db, 'asistencia', `${r.sabadoId}_${r.janijId}`), r)
    )
  )
}
