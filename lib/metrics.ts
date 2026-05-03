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
  const attended = registros.filter(r => r.vino && sabadoIds.has(r.sabadoId)).length
  return Math.round((attended / (sabadoIds.size * totalNinos)) * 100)
}

export function countAttendanceForSabado(sabadoId: string, ninoIds: Set<string>, registros: Registro[]): number {
  return registros.filter(r => r.sabadoId === sabadoId && r.vino && ninoIds.has(r.ninoId)).length
}

export function countPaidForSabado(sabadoId: string, ninoIds: Set<string>, registros: Registro[]): number {
  return registros.filter(r => r.sabadoId === sabadoId && r.vino && r.pago && ninoIds.has(r.ninoId)).length
}

export function computeDebtRows(ninos: Nino[], sabados: Sabado[], registros: Registro[]) {
  const sabadoById = new Map(sabados.map(s => [s.id, s]))
  return ninos
    .filter(isActiveNino)
    .map(nino => {
      const sabadosDebe = registros
        .filter(r => r.ninoId === nino.id && r.vino && !r.pago && sabadoById.has(r.sabadoId))
        .map(r => sabadoById.get(r.sabadoId)!)
      const deuda = sabadosDebe.reduce((sum, sabado) => sum + (Number(sabado.monto) || 0), 0)
      return { nino, deuda, sabados: sabadosDebe }
    })
    .filter(row => row.deuda > 0)
    .sort((a, b) => b.deuda - a.deuda)
}
