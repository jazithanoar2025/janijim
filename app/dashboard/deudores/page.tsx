'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { PageFade } from '@/components/ui/page-fade'
import { getAllNinos, getAllRegistros, getAllSabados, getAppConfig, getGrupos } from '@/lib/firestore'
import { computeDebtRows, filterSabadosByYear, getYears } from '@/lib/metrics'
import type { Grupo, Nino, Registro, Sabado } from '@/lib/types'

export default function DeudoresPage() {
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [sabados, setSabados] = useState<Sabado[]>([])
  const [ninos, setNinos] = useState<Nino[]>([])
  const [registros, setRegistros] = useState<Registro[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getAllSabados(), getAllNinos(), getAllRegistros(), getGrupos(), getAppConfig()])
      .then(([sabadosData, ninosData, registrosData, gruposData, config]) => {
        setSabados(sabadosData)
        setNinos(ninosData)
        setRegistros(registrosData)
        setGrupos(gruposData)
        setYear(config.añoActivo)
      })
      .catch(err => {
        console.error('Failed to load debtors:', err)
        setError('No se pudieron cargar los deudores.')
      })
      .finally(() => setLoading(false))
  }, [])

  const years = useMemo(() => getYears(sabados, year), [sabados, year])
  const grupoMap = useMemo(() => new Map(grupos.map(g => [g.id, g.nombre])), [grupos])
  const rows = useMemo(() => computeDebtRows(ninos, filterSabadosByYear(sabados, year), registros), [ninos, sabados, year, registros])

  if (loading) return <PageFade>{[0, 1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse mb-2" />)}</PageFade>

  return (
    <PageFade>
      <div className="space-y-5">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-red-600">Seguimiento financiero</p>
              <h2 className="text-2xl font-bold text-slate-950">Deudores</h2>
            </div>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="h-9 rounded-lg border bg-white px-3 text-sm">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {rows.length === 0 && <div className="rounded-xl border bg-white p-4 text-sm text-slate-500">No hay deudores para {year}.</div>}
        <div className="grid gap-3">
          {rows.map(row => (
            <div key={row.nino.id} className="rounded-2xl border bg-white p-4 shadow-sm transition-colors duration-100 hover:bg-slate-50">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-950">{row.nino.nombre} {row.nino.apellido}</p>
                  <p className="text-sm text-slate-500">{grupoMap.get(row.nino.grupoId) ?? row.nino.grupoId}</p>
                </div>
                <p className="text-xl font-bold text-red-600">${row.deuda}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {row.sabados.map(sabado => (
                  <span key={sabado.id} className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                    <CalendarDays size={12} />
                    {new Date(`${sabado.fecha}T00:00:00`).toLocaleDateString('es-UY')} · ${sabado.monto}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageFade>
  )
}
