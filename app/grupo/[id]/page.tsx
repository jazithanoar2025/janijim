'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { CalendarDays, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PageFade } from '@/components/ui/page-fade'
import { getAllSabados, getAppConfig, getNinosByGrupo, getRegistrosByNinos } from '@/lib/firestore'
import { averageAttendanceCountPerSabado, countAttendanceForSabado, filterSabadosByYear, getYears, isActiveNino } from '@/lib/metrics'
import type { Nino, Registro, Sabado } from '@/lib/types'

export default function GrupoHomePage() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [sabados, setSabados] = useState<Sabado[]>([])
  const [ninos, setNinos] = useState<Nino[]>([])
  const [registros, setRegistros] = useState<Registro[]>([])
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([getAllSabados(), getNinosByGrupo(id), getAppConfig()])
      .then(async ([sabadosData, ninosData, config]) => {
        if (cancelled) return
        const registrosData = await getRegistrosByNinos(ninosData.map(n => n.id))
        if (cancelled) return
        setSabados(sabadosData)
        setNinos(ninosData)
        setRegistros(registrosData)
        setYear(config.añoActivo)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load group home:', err)
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id])

  const activeNinos = useMemo(() => ninos.filter(isActiveNino), [ninos])
  const activeNinoIds = useMemo(() => new Set(activeNinos.map(n => n.id)), [activeNinos])
  const sabadosYear = useMemo(() => filterSabadosByYear(sabados, year), [sabados, year])
  const years = useMemo(() => getYears(sabados, year), [sabados, year])
  const promedio = averageAttendanceCountPerSabado(sabadosYear, activeNinoIds, registros)

  if (loading) {
    return (
      <PageFade>
        <div className="space-y-4">
          <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          {[0, 1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse mb-2" />)}
        </div>
      </PageFade>
    )
  }

  return (
    <PageFade>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Inicio</h2>
            <p className="text-sm text-slate-500">Sábados institucionales de la kvutza</p>
          </div>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="h-8 rounded-lg border bg-white px-2 text-sm">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Card className="animate-pop" style={{ animationDelay: '0ms' }}><CardContent className="p-3"><Users size={18} className="text-slate-500" /><p className="text-xl font-bold">{activeNinos.length}</p><p className="text-xs text-slate-500">En lista</p></CardContent></Card>
          <Card className="animate-pop" style={{ animationDelay: '50ms' }}><CardContent className="p-3"><CalendarDays size={18} className="text-slate-500" /><p className="text-xl font-bold">{sabadosYear.length}</p><p className="text-xs text-slate-500">Sábados</p></CardContent></Card>
          <Card className="animate-pop" style={{ animationDelay: '100ms' }}><CardContent className="p-3"><Users size={18} className="text-slate-500" /><p className="text-xl font-bold">{promedio}</p><p className="text-xs text-slate-500">Prom. janijim</p></CardContent></Card>
        </div>

        <div className="space-y-2">
          {sabadosYear.map((sabado, i) => (
            <Link
              key={sabado.id}
              href={`/grupo/${id}/sabado/${sabado.id}`}
              className="block rounded-xl border bg-white p-4 transition-colors duration-100 hover:bg-slate-50 animate-fade-up"
              style={{ animationDelay: `${i * 35}ms` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{new Date(`${sabado.fecha}T00:00:00`).toLocaleDateString('es-UY')}</p>
                  <p className="text-xs text-slate-500">${sabado.monto}</p>
                </div>
                <p className="text-sm text-slate-600">
                  {countAttendanceForSabado(sabado.id, activeNinoIds, registros)}/{activeNinos.length} vinieron
                </p>
              </div>
            </Link>
          ))}
          {sabadosYear.length === 0 && <p className="text-sm text-slate-400">No hay sábados cargados para {year}.</p>}
        </div>
      </div>
    </PageFade>
  )
}
