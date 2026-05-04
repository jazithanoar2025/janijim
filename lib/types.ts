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

export interface Nino {
  id: string
  nombre: string
  apellido: string
  grupoId: string
  escuela?: string
  escuelaId?: string
  telefono?: string
  observaciones?: string
  activo: boolean
  creadoEn?: string
  creadoPor?: string
}

export interface Sabado {
  id: string
  fecha: string
  monto: number
  observacion?: string
  creadoEn?: string
  creadoPor?: string
}

export interface Registro {
  id: string
  sabadoId: string
  ninoId: string
  vino: boolean
  pago: boolean
  fechaHora?: string
  registradoPor?: string
}

export interface AppConfig {
  añoActivo: number
  umbralFidelidadAlerta: number
}
