'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { PageFade } from '@/components/ui/page-fade'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getAllNinos, getAllRegistros, getAllSabados, getAppConfig, getGrupos } from '@/lib/firestore'
import {
  averageAttendanceCountPerSabado,
  averageJanijFidelity,
  countAttendanceForSabado,
  filterSabadosByYear,
  groupBySchool,
  isActiveNino,
  ninoAttendancePercent,
} from '@/lib/metrics'
import type { Grupo, Nino, Registro, Sabado } from '@/lib/types'

export default function StatsPage() {
  const currentYear = new Date().getFullYear()
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(currentYear)
  const [ninos, setNinos] = useState<Nino[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [sabados, setSabados] = useState<Sabado[]>([])
  const [registros, setRegistros] = useState<Registro[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getAllNinos(), getGrupos(), getAllSabados(), getAllRegistros(), getAppConfig()])
      .then(([ninosData, gruposData, sabadosData, registrosData, config]) => {
        setNinos(ninosData)
        setGrupos(gruposData)
        setSabados(sabadosData)
        setRegistros(registrosData)
        setYear(config.añoActivo)
      })
      .catch(err => {
        console.error('Failed to load stats:', err)
        setError('No se pudieron cargar las estadísticas.')
      })
      .finally(() => setLoading(false))
  }, [])

  const years = useMemo(() => Array.from(new Set([...sabados.map(s => Number(s.fecha.slice(0, 4))).filter(Number.isFinite), currentYear])).sort((a, b) => b - a), [sabados, currentYear])
  const sabadosYear = useMemo(() => filterSabadosByYear(sabados, year), [sabados, year])
  const operationalNinos = useMemo(() => ninos.filter(isActiveNino), [ninos])
  const activeNinos = useMemo(() => operationalNinos.filter(nino => ninoAttendancePercent(nino.id, sabadosYear, registros) > 0), [operationalNinos, sabadosYear, registros])
  const ninoIds = useMemo(() => new Set(operationalNinos.map(n => n.id)), [operationalNinos])

  const general = {
    activos: activeNinos.length,
    sabados: sabadosYear.length,
    promedioNinos: averageAttendanceCountPerSabado(sabadosYear, ninoIds, registros),
    fidelidad: averageJanijFidelity(operationalNinos, sabadosYear, registros),
  }

  const byKvutza = grupos.map(grupo => {
    const grupoNinos = operationalNinos.filter(n => n.grupoId === grupo.id)
    const ids = new Set(grupoNinos.map(n => n.id))
    return {
      nombre: grupo.nombre,
      janijim: grupoNinos.length,
      promedio: averageAttendanceCountPerSabado(sabadosYear, ids, registros),
      fidelidad: averageJanijFidelity(grupoNinos, sabadosYear, registros),
    }
  }).sort((a, b) => b.janijim - a.janijim)

  const byEscuela = groupBySchool(operationalNinos, sabadosYear, registros)
  const trend = sabadosYear.slice().reverse().map(sabado => ({
    fecha: sabado.fecha.slice(5),
    asistentes: countAttendanceForSabado(sabado.id, ninoIds, registros),
  }))
  const yearlyData = years.slice().reverse().map(y => {
    const sabadosY = filterSabadosByYear(sabados, y)
    return {
      year: y,
      promedio: averageAttendanceCountPerSabado(sabadosY, ninoIds, registros),
      fidelidad: averageJanijFidelity(operationalNinos, sabadosY, registros),
      sabados: sabadosY.length,
    }
  })

  if (loading) {
    return (
      <PageFade>
        <div className="h-48 bg-slate-100 rounded-xl animate-pulse mb-4" />
        <div className="h-48 bg-slate-100 rounded-xl animate-pulse" />
      </PageFade>
    )
  }

  return (
    <PageFade>
      <div className="space-y-6">
        <div className="rounded-2xl bg-slate-950 p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-200">Lectura por kvutza, escuela y general</p>
              <h2 className="text-2xl font-bold">Estadísticas</h2>
            </div>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="h-9 rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-white">
              {years.map(y => <option key={y} value={y} className="text-slate-900">{y}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4"><p className="text-2xl font-bold">{general.activos}</p><p className="text-xs text-slate-500">Janijim activos</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold">{general.sabados}</p><p className="text-xs text-slate-500">Sábados</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold">{general.promedioNinos}</p><p className="text-xs text-slate-500">Promedio niños</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold">{general.fidelidad}%</p><p className="text-xs text-slate-500">Fidelidad promedio</p></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-slate-700 mb-4">Cantidad de asistentes por sábado</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="asistentes" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-slate-700 mb-4">Por kvutza</p>
              <Table>
                <TableHeader><TableRow><TableHead>Kvutza</TableHead><TableHead>Janijim</TableHead><TableHead>Promedio</TableHead><TableHead>Fidelidad</TableHead></TableRow></TableHeader>
                <TableBody>
                  {byKvutza.map(row => (
                    <TableRow key={row.nombre}>
                      <TableCell>{row.nombre}</TableCell>
                      <TableCell>{row.janijim}</TableCell>
                      <TableCell>{row.promedio}</TableCell>
                      <TableCell>{row.fidelidad}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-slate-700 mb-4">Por escuela</p>
              <Table>
                <TableHeader><TableRow><TableHead>Escuela</TableHead><TableHead>Janijim</TableHead><TableHead>Fidelidad</TableHead></TableRow></TableHeader>
                <TableBody>
                  {byEscuela.map(row => (
                    <TableRow key={row.escuela}>
                      <TableCell>{row.escuela}</TableCell>
                      <TableCell>{row.janijim}</TableCell>
                      <TableCell>{row.fidelidad}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-slate-700 mb-4">Histórico preservado</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="promedio" stroke="#0f766e" strokeWidth={2} />
                <Line type="monotone" dataKey="fidelidad" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </PageFade>
  )
}
