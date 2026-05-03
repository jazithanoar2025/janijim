'use client'

import { useEffect, useMemo, useState } from 'react'
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

  useEffect(() => {
    Promise.all([getAllSabados(), getAllNinos(), getAllRegistros(), getGrupos(), getAppConfig()])
      .then(([sabadosData, ninosData, registrosData, gruposData, config]) => {
        setSabados(sabadosData)
        setNinos(ninosData)
        setRegistros(registrosData)
        setGrupos(gruposData)
        setYear(config.añoActivo)
      })
      .finally(() => setLoading(false))
  }, [])

  const years = useMemo(() => getYears(sabados, year), [sabados, year])
  const grupoMap = useMemo(() => new Map(grupos.map(g => [g.id, g.nombre])), [grupos])
  const rows = useMemo(() => computeDebtRows(ninos, filterSabadosByYear(sabados, year), registros), [ninos, sabados, year, registros])

  if (loading) return <PageFade>{[0, 1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse mb-2" />)}</PageFade>

  return (
    <PageFade>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Deudores</h2>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="h-8 rounded-lg border bg-white px-2 text-sm">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {rows.length === 0 && <div className="rounded-xl border bg-white p-4 text-sm text-slate-500">No hay deudores para {year}.</div>}
        {rows.map(row => (
          <div key={row.nino.id} className="rounded-xl border bg-white p-4 transition-colors duration-100 hover:bg-slate-50">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{row.nino.nombre} {row.nino.apellido}</p>
                <p className="text-sm text-slate-500">{grupoMap.get(row.nino.grupoId) ?? row.nino.grupoId}</p>
              </div>
              <p className="text-lg font-bold text-slate-900">${row.deuda}</p>
            </div>
          </div>
        ))}
      </div>
    </PageFade>
  )
}
