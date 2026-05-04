import type { Nino, Registro, Sabado } from './types'

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
  const attended = new Set(registros.filter(r => r.vino && sabadoIds.has(r.sabadoId)).map(r => `${r.sabadoId}:${r.ninoId}`)).size
  return Math.round((attended / (sabadoIds.size * totalNinos)) * 100)
}

export function ninoAttendancePercent(ninoId: string, sabados: Sabado[], registros: Registro[]): number {
  if (sabados.length === 0) return 0
  const sabadoIds = new Set(sabados.map(s => s.id))
  const attended = new Set(registros.filter(r => r.ninoId === ninoId && r.vino && sabadoIds.has(r.sabadoId)).map(r => r.sabadoId)).size
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
  return new Set(registros.filter(r => r.sabadoId === sabadoId && r.vino && ninoIds.has(r.ninoId)).map(r => r.ninoId)).size
}

export function countPaidForSabado(sabadoId: string, ninoIds: Set<string>, registros: Registro[]): number {
  return new Set(registros.filter(r => r.sabadoId === sabadoId && r.vino && r.pago && ninoIds.has(r.ninoId)).map(r => r.ninoId)).size
}

export function computeDebtRows(ninos: Nino[], sabados: Sabado[], registros: Registro[]) {
  const sabadoById = new Map(sabados.map(s => [s.id, s]))
  return ninos
    .filter(isActiveNino)
    .map(nino => {
      const sabadosDebe = registros
        .filter(r => r.ninoId === nino.id && r.vino && !r.pago && sabadoById.has(r.sabadoId))
        .reduce<Sabado[]>((items, r) => {
          if (!items.some(sabado => sabado.id === r.sabadoId)) items.push(sabadoById.get(r.sabadoId)!)
          return items
        }, [])
      const deuda = sabadosDebe.reduce((sum, sabado) => sum + (Number(sabado.monto) || 0), 0)
      return { nino, deuda, sabados: sabadosDebe }
    })
    .filter(row => row.deuda > 0)
    .sort((a, b) => b.deuda - a.deuda)
}

export function groupBySchool(ninos: Nino[], sabados: Sabado[], registros: Registro[]) {
  const buckets = new Map<string, { label: string; ninos: Nino[] }>()
  for (const nino of ninos) {
    const label = nino.escuela?.trim() || 'Sin escuela'
    const key = normalizeSchoolName(label)
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

function normalizeSchoolName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toUpperCase()
}
