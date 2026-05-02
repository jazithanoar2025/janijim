import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  setDoc,
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
