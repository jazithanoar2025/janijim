export type UserRole = 'superadmin' | 'admin'

export interface Usuario {
  uid: string
  email: string
  nombre: string
  rol: UserRole
  grupoId: string | null
}

export interface Grupo {
  id: string
  nombre: string
  adminUid?: string
}

export interface Janij {
  id: string
  nombre: string
  apellido: string
  grupoId: string
  escuela?: string
  telefono?: string
  observaciones?: string
}

export interface Sabado {
  id: string
  fecha: string       // ISO date string YYYY-MM-DD
  monto: number
  observacion?: string
  grupoId: string
}

export interface RegistroAsistencia {
  id: string
  janijId: string
  sabadoId: string
  grupoId: string
  asistio: boolean
  deuda: number
}

export interface StatsHistorico {
  año: number
  janijimTotal: number
  janijimReales: number
  janijimNuevos: number
  janijimPerdidos: number
  asistenciaPromedio: number
  deudaTotal: number
  porEscuela: Record<string, {
    lista: number
    reales: number
    fidelidad: number
  }>
  sabados: Array<{
    fecha: string
    asistentes: number
    pct: number
    deuda: number
  }>
}

export interface AppConfig {
  añoActivo: number
  umbralFidelidadAlerta: number
}
