'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { PageFade } from '@/components/ui/page-fade'
import { getAllSabados, getAppConfig, getNinosByGrupo, getRegistrosByNinos } from '@/lib/firestore'
import { computeAlerts, type Alerta } from '@/lib/alerts'

export default function AlertasPage() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState<Alerta[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([getAllSabados(), getNinosByGrupo(id), getAppConfig()])
      .then(async ([sabados, ninos, config]) => {
        if (cancelled) return
        const registros = await getRegistrosByNinos(ninos.map(n => n.id))
        if (cancelled) return
        setAlerts(computeAlerts(sabados, ninos, registros, config.umbralFidelidadAlerta, config.añoActivo))
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load alerts:', err)
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return (
      <PageFade>
        {[0, 1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse mb-2" />)}
      </PageFade>
    )
  }

  return (
    <PageFade>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Alertas</h2>
          <p className="text-sm text-slate-500">Fidelidad por debajo del umbral configurado</p>
        </div>

        {alerts.length === 0 && (
          <div className="rounded-xl border bg-white p-4 text-sm text-slate-500">
            Todos los janijim superan el umbral de fidelidad
          </div>
        )}

        <div className="space-y-2">
          {alerts.map(({ nino, fidelidad, severity }) => (
            <div key={nino.id} className="rounded-xl border bg-white p-4 transition-colors duration-100 hover:bg-slate-50">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{nino.nombre} {nino.apellido}</p>
                  {nino.escuela && <p className="text-xs text-slate-400">{nino.escuela}</p>}
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">{fidelidad}%</p>
                  <Badge className={severity === 'critical' ? 'bg-red-500' : 'bg-yellow-500'}>
                    {severity === 'critical' ? 'Crítica' : 'Atención'}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageFade>
  )
}
