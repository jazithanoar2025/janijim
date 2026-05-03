import type { Nino, Sabado, Registro } from './types'

export interface Alerta {
  nino: Nino
  fidelidad: number
  severity: 'warning' | 'critical'
}

export function computeAlerts(
  sabados: Sabado[],
  ninos: Nino[],
  registros: Registro[],
  umbral: number,
  año: number
): Alerta[] {
  const sabadosAnio = sabados.filter(s => s.fecha.startsWith(String(año)))
  if (sabadosAnio.length === 0) return []

  const sabadoIds = new Set(sabadosAnio.map(s => s.id))
  const vinoMap = new Map<string, number>()
  for (const r of registros) {
    if (r.vino && sabadoIds.has(r.sabadoId)) {
      vinoMap.set(r.ninoId, (vinoMap.get(r.ninoId) ?? 0) + 1)
    }
  }

  const alerts: Alerta[] = []
  for (const nino of ninos) {
    if (!nino.activo) continue
    const asistencias = vinoMap.get(nino.id) ?? 0
    const fidelidad = Math.round((asistencias / sabadosAnio.length) * 100)
    if (fidelidad < umbral) {
      alerts.push({
        nino,
        fidelidad,
        severity: fidelidad < umbral / 2 ? 'critical' : 'warning',
      })
    }
  }

  return alerts.sort((a, b) => a.fidelidad - b.fidelidad)
}
