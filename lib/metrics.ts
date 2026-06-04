import type { Nino, Registro, Sabado } from './types'
import { formatNinoEscuela, normalizeEscuelaText } from './escuelas'

interface RegistroIndex {
  vinoSabadosByNino: Map<string, Set<string>>
  vinoNinosBySabado: Map<string, Set<string>>
  pagoNinosBySabado: Map<string, Set<string>>
  deudaSabadosByNino: Map<string, Set<string>>
}

const registroIndexCache = new WeakMap<Registro[], RegistroIndex>()
const sabadoIdsCache = new WeakMap<Sabado[], Set<string>>()

export function isActiveNino(nino: Nino): boolean {
  return nino.activo !== false
}

export function getYears(sabados: Sabado[], fallback = new Date().getFullYear()): number[] {
  const years = Array.from(new Set(sabados.map(s => Number(s.fecha.slice(0, 4))).filter(Number.isFinite)))
  if (!years.includes(fallback)) years.push(fallback)
  return years.sort((a, b) => b - a)
}

export function filterSabadosByYear(sabados: Sabado[], year: number): Sabado[] {
  return sabados.filter(s => s.fecha.startsWith(String(year)))
}

export function attendanceRate(sabadoIds: Set<string>, registros: Registro[], totalNinos: number): number {
  if (sabadoIds.size === 0 || totalNinos === 0) return 0
  let attended = 0
  for (const [sabadoId, ninos] of getRegistroIndex(registros).vinoNinosBySabado) {
    if (sabadoIds.has(sabadoId)) attended += ninos.size
  }
  return Math.round((attended / (sabadoIds.size * totalNinos)) * 100)
}

export function ninoAttendancePercent(ninoId: string, sabados: Sabado[], registros: Registro[]): number {
  if (sabados.length === 0) return 0
  const sabadoIds = getSabadoIds(sabados)
  const attendedSabados = getRegistroIndex(registros).vinoSabadosByNino.get(ninoId)
  if (!attendedSabados) return 0
  let attended = 0
  for (const sabadoId of attendedSabados) {
    if (sabadoIds.has(sabadoId)) attended += 1
  }
  return Math.round((attended / sabados.length) * 100)
}

export function isNuevoNino(nino: Nino, responsableEmails?: Set<string>): boolean {
  const creator = nino.creadoPor?.trim().toLowerCase()
  if (nino.creadoPorRol) return nino.creadoPorRol === 'admin'
  if (!creator) return false
  return responsableEmails?.has(creator) ?? false
}

export function isInactiveByAttendance(nino: Nino, sabados: Sabado[], registros: Registro[]): boolean {
  return ninoAttendancePercent(nino.id, sabados, registros) === 0
}

export function averageJanijFidelity(ninos: Nino[], sabados: Sabado[], registros: Registro[]): number {
  if (ninos.length === 0 || sabados.length === 0) return 0
  const total = ninos.reduce((sum, nino) => sum + ninoAttendancePercent(nino.id, sabados, registros), 0)
  return Math.round(total / ninos.length)
}

export function averageAttendanceCountPerSabado(sabados: Sabado[], ninoIds: Set<string>, registros: Registro[]): number {
  if (sabados.length === 0) return 0
  const total = sabados.reduce((sum, sabado) => sum + countAttendanceForSabado(sabado.id, ninoIds, registros), 0)
  return Math.round((total / sabados.length) * 10) / 10
}

export function countAttendanceForSabado(sabadoId: string, ninoIds: Set<string>, registros: Registro[]): number {
  return countMatchingNinos(getRegistroIndex(registros).vinoNinosBySabado.get(sabadoId), ninoIds)
}

export function countPaidForSabado(sabadoId: string, ninoIds: Set<string>, registros: Registro[]): number {
  return countMatchingNinos(getRegistroIndex(registros).pagoNinosBySabado.get(sabadoId), ninoIds)
}

export function computeDebtRows(ninos: Nino[], sabados: Sabado[], registros: Registro[]) {
  const sabadoById = new Map(sabados.map(s => [s.id, s]))
  const deudaByNino = getRegistroIndex(registros).deudaSabadosByNino
  return ninos
    .filter(isActiveNino)
    .map(nino => {
      const sabadosDebe = Array.from(deudaByNino.get(nino.id) ?? [])
        .map(sabadoId => sabadoById.get(sabadoId))
        .filter((sabado): sabado is Sabado => Boolean(sabado))
      const deuda = sabadosDebe.reduce((sum, sabado) => sum + (Number(sabado.monto) || 0), 0)
      return { nino, deuda, sabados: sabadosDebe }
    })
    .filter(row => row.deuda > 0)
    .sort((a, b) => b.deuda - a.deuda)
}

export function groupBySchool(ninos: Nino[], sabados: Sabado[], registros: Registro[]) {
  const buckets = new Map<string, { label: string; ninos: Nino[] }>()
  for (const nino of ninos) {
    const label = formatNinoEscuela(nino)
    const key = nino.escuelaId ? `id:${nino.escuelaId}` : `text:${normalizeEscuelaText(label)}`
    const bucket = buckets.get(key) ?? { label, ninos: [] }
    bucket.ninos.push(nino)
    buckets.set(key, bucket)
  }

  return Array.from(buckets.values())
    .map(({ label, ninos: escuelaNinos }) => ({
      escuela: label,
      janijim: escuelaNinos.length,
      fidelidad: averageJanijFidelity(escuelaNinos, sabados, registros),
    }))
    .sort((a, b) => b.janijim - a.janijim)
}

function getRegistroIndex(registros: Registro[]): RegistroIndex {
  const cached = registroIndexCache.get(registros)
  if (cached) return cached
  const index: RegistroIndex = {
    vinoSabadosByNino: new Map(),
    vinoNinosBySabado: new Map(),
    pagoNinosBySabado: new Map(),
    deudaSabadosByNino: new Map(),
  }
  for (const registro of registros) {
    if (!registro.vino) continue
    addToSetMap(index.vinoSabadosByNino, registro.ninoId, registro.sabadoId)
    addToSetMap(index.vinoNinosBySabado, registro.sabadoId, registro.ninoId)
    if (registro.pago) {
      addToSetMap(index.pagoNinosBySabado, registro.sabadoId, registro.ninoId)
    } else {
      addToSetMap(index.deudaSabadosByNino, registro.ninoId, registro.sabadoId)
    }
  }
  registroIndexCache.set(registros, index)
  return index
}

function getSabadoIds(sabados: Sabado[]): Set<string> {
  const cached = sabadoIdsCache.get(sabados)
  if (cached) return cached
  const ids = new Set(sabados.map(sabado => sabado.id))
  sabadoIdsCache.set(sabados, ids)
  return ids
}

function addToSetMap(map: Map<string, Set<string>>, key: string, value: string) {
  const set = map.get(key) ?? new Set<string>()
  set.add(value)
  map.set(key, set)
}

function countMatchingNinos(values: Set<string> | undefined, ninoIds: Set<string>): number {
  if (!values || values.size === 0 || ninoIds.size === 0) return 0
  let count = 0
  for (const ninoId of values) {
    if (ninoIds.has(ninoId)) count += 1
  }
  return count
}
