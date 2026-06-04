import type { Nino, Sabado, Registro } from './types'

export interface Alerta {
  nino: Nino
  fidelidad: number
  asistencias: number
  faltasConsecutivas: number
  ultimaAsistencia?: string
  severity: 'warning' | 'critical'
}

export function computeAlerts(
  sabados: Sabado[],
  ninos: Nino[],
  registros: Registro[],
  umbral: number,
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
    if (nino.activo === false) continue
    const vinoIds = vinoByNino.get(nino.id) ?? new Set<string>()
    const asistencias = vinoIds.size
    if (asistencias === 0) continue

    const fidelidad = Math.round((asistencias / sabadosAnio.length) * 100)
    const lastAttendedIndex = findLastIndex(sabadosAnio, sabado => vinoIds.has(sabado.id))
    const faltasConsecutivas = lastAttendedIndex === -1 ? sabadosAnio.length : sabadosAnio.length - lastAttendedIndex - 1

    if (fidelidad < umbral) {
      alerts.push({
        nino,
        fidelidad,
        asistencias,
        faltasConsecutivas,
        ultimaAsistencia: sabadosAnio[lastAttendedIndex]?.fecha,
        severity: fidelidad < umbral / 2 ? 'critical' : 'warning',
      })
    }
  }

  return alerts.sort((a, b) => a.fidelidad - b.fidelidad || b.faltasConsecutivas - a.faltasConsecutivas)
}

function findLastIndex<T>(items: T[], predicate: (item: T) => boolean): number {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (predicate(items[i])) return i
  }
  return -1
}
