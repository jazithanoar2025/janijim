'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, UsersRound } from 'lucide-react'
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
  const [grupoId, setGrupoId] = useState('todos')
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
  const groupTotals = useMemo(() => {
    const totals = new Map<string, { grupoId: string; grupoNombre: string; deuda: number; deudores: number }>()
    for (const row of rows) {
      const current = totals.get(row.nino.grupoId) ?? {
        grupoId: row.nino.grupoId,
        grupoNombre: grupoMap.get(row.nino.grupoId) ?? row.nino.grupoId,
        deuda: 0,
        deudores: 0,
      }
      current.deuda += row.deuda
      current.deudores += 1
      totals.set(row.nino.grupoId, current)
    }
    return Array.from(totals.values()).sort((a, b) => b.deuda - a.deuda)
  }, [rows, grupoMap])
  const filteredRows = useMemo(() => rows.filter(row => grupoId === 'todos' || row.nino.grupoId === grupoId), [rows, grupoId])
  const totalDeuda = useMemo(() => filteredRows.reduce((sum, row) => sum + row.deuda, 0), [filteredRows])
  const selectedGroupTotal = useMemo(() => grupoId === 'todos' ? groupTotals : groupTotals.filter(group => group.grupoId === grupoId), [groupTotals, grupoId])

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
            <div className="grid gap-2 sm:grid-cols-2">
              <select value={grupoId} onChange={e => setGrupoId(e.target.value)} className="h-9 rounded-lg border bg-white px-3 text-sm">
                <option value="todos">Todas las kvutzot</option>
                {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
              <select value={year} onChange={e => setYear(Number(e.target.value))} className="h-9 rounded-lg border bg-white px-3 text-sm">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Deuda total</p>
            <p className="mt-1 text-2xl font-bold text-red-600">${totalDeuda}</p>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Deudores</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{filteredRows.length}</p>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Kvutzot con deuda</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{selectedGroupTotal.length}</p>
          </div>
        </div>

        {selectedGroupTotal.length > 0 && (
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h3 className="flex items-center gap-2 font-semibold text-slate-950"><UsersRound size={17} /> Deuda por kvutza</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {selectedGroupTotal.map(group => (
                <button
                  key={group.grupoId}
                  onClick={() => setGrupoId(group.grupoId)}
                  className={`rounded-xl border p-3 text-left transition-colors duration-100 hover:bg-slate-50 ${grupoId === group.grupoId ? 'border-red-300 bg-red-50' : 'bg-white'}`}
                >
                  <p className="font-medium text-slate-900">{group.grupoNombre}</p>
                  <p className="text-sm text-slate-500">{group.deudores} deudores</p>
                  <p className="mt-1 text-lg font-bold text-red-600">${group.deuda}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {filteredRows.length === 0 && <div className="rounded-xl border bg-white p-4 text-sm text-slate-500">No hay deudores para {year}.</div>}
        <div className="grid gap-3">
          {filteredRows.map(row => (
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
