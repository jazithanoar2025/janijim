import type { Nino, Sabado, Registro } from './types'

export interface Alerta {
  nino: Nino
  fidelidad: number
  faltasConsecutivas: number
  ultimaAsistencia?: string
  severity: 'warning' | 'critical'
}

export function computeAlerts(
  sabados: Sabado[],
  ninos: Nino[],
  registros: Registro[],
  _umbral: number,
  año: number
): Alerta[] {
  const sabadosAnio = sabados
    .filter(s => s.fecha.startsWith(String(año)))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
  if (sabadosAnio.length === 0) return []

  const sabadoIds = new Set(sabadosAnio.map(s => s.id))
  const vinoByNino = new Map<string, Set<string>>()
  for (const r of registros) {
    if (r.vino && sabadoIds.has(r.sabadoId)) {
      const ids = vinoByNino.get(r.ninoId) ?? new Set<string>()
      ids.add(r.sabadoId)
      vinoByNino.set(r.ninoId, ids)
    }
  }

  const alerts: Alerta[] = []
  for (const nino of ninos) {
    const vinoIds = vinoByNino.get(nino.id) ?? new Set<string>()
    const asistencias = vinoIds.size
    if (asistencias === 0) continue

    const fidelidad = Math.round((asistencias / sabadosAnio.length) * 100)
    const lastAttendedIndex = findLastIndex(sabadosAnio, sabado => vinoIds.has(sabado.id))
    const faltasConsecutivas = sabadosAnio.length - lastAttendedIndex - 1

    if (faltasConsecutivas > 0) {
      alerts.push({
        nino,
        fidelidad,
        faltasConsecutivas,
        ultimaAsistencia: sabadosAnio[lastAttendedIndex]?.fecha,
        severity: faltasConsecutivas >= 3 ? 'critical' : 'warning',
      })
    }
  }

  return alerts.sort((a, b) => b.faltasConsecutivas - a.faltasConsecutivas || a.fidelidad - b.fidelidad)
}

function findLastIndex<T>(items: T[], predicate: (item: T) => boolean): number {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (predicate(items[i])) return i
  }
  return -1
}
