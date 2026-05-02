import type { Janij, Sabado, RegistroAsistencia } from './types'

export interface Alerta {
  janij: Janij
  consecutiveAbsences: number
  severity: 'warning' | 'critical'
}

export function computeAlerts(
  sabados: Sabado[],      // must be sorted desc by fecha (newest first)
  janijim: Janij[],
  asistencia: RegistroAsistencia[]
): Alerta[] {
  // Build map: `${sabadoId}_${janijId}` → asistio
  const asistioMap = new Map<string, boolean>()
  for (const r of asistencia) {
    asistioMap.set(`${r.sabadoId}_${r.janijId}`, r.asistio)
  }

  const alerts: Alerta[] = []

  for (const janij of janijim) {
    let consecutive = 0
    for (const sab of sabados) {
      const attended = asistioMap.get(`${sab.id}_${janij.id}`)
      if (attended === true) break
      consecutive++
    }
    if (consecutive >= 2) {
      alerts.push({
        janij,
        consecutiveAbsences: consecutive,
        severity: consecutive >= 3 ? 'critical' : 'warning',
      })
    }
  }

  // Sort: critical first, then by consecutiveAbsences desc
  return alerts.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1
    return b.consecutiveAbsences - a.consecutiveAbsences
  })
}
