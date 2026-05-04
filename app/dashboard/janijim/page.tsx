'use client'

import { useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { PageFade } from '@/components/ui/page-fade'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getAllNinos, getAllRegistros, getAllSabados, getAppConfig, getGrupos } from '@/lib/firestore'
import { filterSabadosByYear, isActiveNino, isNuevoNino, ninoAttendancePercent } from '@/lib/metrics'
import type { Nino, Registro, Sabado } from '@/lib/types'

interface Row extends Nino {
  grupoNombre: string
  asistencia: number
}

type SortMode = 'asistencia-desc' | 'asistencia-asc' | 'grupo' | 'apellido'

export default function JanijimPage() {
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [onlyActive, setOnlyActive] = useState(true)
  const [onlyNew, setOnlyNew] = useState(false)
  const [grupoId, setGrupoId] = useState('todos')
  const [sortMode, setSortMode] = useState<SortMode>('asistencia-desc')
  const [year, setYear] = useState(new Date().getFullYear())
  const [ninos, setNinos] = useState<Nino[]>([])
  const [sabados, setSabados] = useState<Sabado[]>([])
  const [registros, setRegistros] = useState<Registro[]>([])
  const [grupoMap, setGrupoMap] = useState(new Map<string, string>())
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getAllNinos(), getGrupos(), getAllSabados(), getAllRegistros(), getAppConfig()])
      .then(([ninosData, grupos, sabadosData, registrosData, config]) => {
        setNinos(ninosData)
        setSabados(sabadosData)
        setRegistros(registrosData)
        setGrupoMap(new Map(grupos.map(g => [g.id, g.nombre])))
        setYear(config.añoActivo)
      })
      .catch(err => {
        console.error('Failed to load janijim:', err)
        setError('No se pudieron cargar los janijim.')
      })
      .finally(() => setLoading(false))
  }, [])

  const sabadosYear = useMemo(() => filterSabadosByYear(sabados, year), [sabados, year])
  const rows = useMemo<Row[]>(() => ninos.map(nino => ({
    ...nino,
    grupoNombre: grupoMap.get(nino.grupoId) ?? nino.grupoId,
    asistencia: isActiveNino(nino) ? ninoAttendancePercent(nino.id, sabadosYear, registros) : 0,
  })), [ninos, grupoMap, sabadosYear, registros])

  const filtered = useMemo(() => rows
    .filter(row => {
      const text = `${row.nombre} ${row.apellido} ${row.grupoNombre} ${row.escuela ?? ''}`.toLowerCase()
      return text.includes(query.toLowerCase()) &&
        (!onlyActive || isActiveNino(row)) &&
        (!onlyNew || isNuevoNino(row)) &&
        (grupoId === 'todos' || row.grupoId === grupoId)
    })
    .sort((a, b) => {
      if (sortMode === 'asistencia-desc') return b.asistencia - a.asistencia || a.apellido.localeCompare(b.apellido)
      if (sortMode === 'asistencia-asc') return a.asistencia - b.asistencia || a.apellido.localeCompare(b.apellido)
      if (sortMode === 'grupo') return a.grupoNombre.localeCompare(b.grupoNombre) || b.asistencia - a.asistencia
      return a.apellido.localeCompare(b.apellido) || a.nombre.localeCompare(b.nombre)
    }), [rows, query, onlyActive, onlyNew, grupoId, sortMode])

  if (loading) return <PageFade>{[0, 1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse mb-2" />)}</PageFade>

  return (
    <PageFade>
      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-2xl font-bold text-slate-950">Janijim</h2>
          <p className="text-sm text-slate-500">{filtered.length} janijim · ordenados por asistencia, kvutza o apellido</p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid gap-2 md:grid-cols-[1fr_160px_160px_160px_auto_auto]">
          <Input placeholder="Buscar..." value={query} onChange={e => setQuery(e.target.value)} />
          <select value={sortMode} onChange={e => setSortMode(e.target.value as SortMode)} className="h-8 rounded-lg border bg-white px-2 text-sm">
            <option value="asistencia-desc">Más asistencia</option>
            <option value="asistencia-asc">Menos asistencia</option>
            <option value="grupo">Por kvutza</option>
            <option value="apellido">Por apellido</option>
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="h-8 rounded-lg border bg-white px-2 text-sm">
            {Array.from(new Set(sabados.map(s => Number(s.fecha.slice(0, 4))).filter(Number.isFinite))).sort((a, b) => b - a).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={grupoId} onChange={e => setGrupoId(e.target.value)} className="h-8 rounded-lg border bg-white px-2 text-sm">
            <option value="todos">Todas las kvutzot</option>
            {Array.from(grupoMap.entries()).sort((a, b) => a[1].localeCompare(b[1])).map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={onlyActive} onChange={e => setOnlyActive(e.target.checked)} />
            Solo activos
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={onlyNew} onChange={e => setOnlyNew(e.target.checked)} />
            Nuevos
          </label>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Kvutza</TableHead><TableHead>Escuela</TableHead><TableHead>Asistencia</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map(row => (
              <TableRow key={row.id} className="transition-colors duration-100 hover:bg-slate-50">
                <TableCell>{row.apellido}, {row.nombre}</TableCell>
                <TableCell>{row.grupoNombre}</TableCell>
                <TableCell>{row.escuela ?? '-'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${row.asistencia}%` }} />
                    </div>
                    <span>{row.asistencia}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <span>{isActiveNino(row) ? 'Activo' : 'Inactivo'}</span>
                    {isNuevoNino(row) && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">Nuevo</span>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageFade>
  )
}
