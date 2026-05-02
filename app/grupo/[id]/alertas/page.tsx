'use client'

import { use, useEffect, useState } from 'react'
import { getSabadosByGrupo, getJanijimByGrupo, getAsistenciaByGrupo } from '@/lib/firestore'
import { computeAlerts } from '@/lib/alerts'
import type { Alerta } from '@/lib/alerts'

interface Props {
  params: Promise<{ id: string }>
}

export default function AlertasPage({ params }: Props) {
  const { id } = use(params)
  const [alerts, setAlerts] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getSabadosByGrupo(id),
      getJanijimByGrupo(id),
      getAsistenciaByGrupo(id),
    ]).then(([sabados, janijim, asistencia]) => {
      if (!cancelled) {
        setAlerts(computeAlerts(sabados, janijim, asistencia))
        setLoading(false)
      }
    }).catch(err => {
      console.error('Failed to load alerts:', err)
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [id])

  if (loading) return <p className="text-slate-500 text-sm">Cargando...</p>

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Alertas</h2>

      {alerts.length === 0 && (
        <p className="text-sm text-slate-400">No hay alertas activas. ¡Todos al día!</p>
      )}

      <div className="space-y-2">
        {alerts.map(({ janij, consecutiveAbsences, severity }) => (
          <div
            key={janij.id}
            className="flex items-center gap-3 bg-white border rounded-lg p-3"
          >
            <span className="text-xl">{severity === 'critical' ? '🔴' : '🟡'}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 truncate">
                {janij.nombre} {janij.apellido}
              </p>
              {janij.escuela && (
                <p className="text-xs text-slate-400 truncate">{janij.escuela}</p>
              )}
            </div>
            <span className="text-sm text-slate-600 shrink-0">
              {consecutiveAbsences} faltas seguidas
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
