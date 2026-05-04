import escuelasData from '@/data/escuelas-uruguay.json'

export interface EscuelaUruguay {
  id: string
  nombre: string
  departamento: string
  localidad: string
  subsistema: string
  codigo: string
}

export const escuelasUruguay = escuelasData as EscuelaUruguay[]

export function formatEscuela(escuela: EscuelaUruguay): string {
  const place = [escuela.localidad, escuela.departamento].filter(Boolean).join(', ')
  return `${escuela.nombre} · ${place} · ${escuela.subsistema}`
}

export function findEscuelaById(id?: string): EscuelaUruguay | undefined {
  if (!id) return undefined
  return escuelasUruguay.find(escuela => escuela.id === id)
}

export function findEscuelaByLabel(label?: string): EscuelaUruguay | undefined {
  if (!label) return undefined
  const trimmed = label.trim()
  return escuelasUruguay.find(escuela => formatEscuela(escuela) === trimmed)
}
