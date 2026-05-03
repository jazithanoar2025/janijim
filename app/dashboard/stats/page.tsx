'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { PageFade } from '@/components/ui/page-fade'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getAllNinos, getAllRegistros, getAllSabados, getGrupos } from '@/lib/firestore'
import { attendanceRate, filterSabadosByYear } from '@/lib/metrics'
import type { Grupo, Nino, Registro, Sabado } from '@/lib/types'

export default function StatsPage() {
  const currentYear = new Date().getFullYear()
  const [loading, setLoading] = useState(true)
  const [startYear, setStartYear] = useState(Math.max(2021, currentYear - 3))
  const [endYear, setEndYear] = useState(currentYear)
  const [ninos, setNinos] = useState<Nino[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [sabados, setSabados] = useState<Sabado[]>([])
  const [registros, setRegistros] = useState<Registro[]>([])

  useEffect(() => {
    Promise.all([getAllNinos(), getGrupos(), getAllSabados(), getAllRegistros()])
      .then(([ninosData, gruposData, sabadosData, registrosData]) => {
        setNinos(ninosData)
        setGrupos(gruposData)
        setSabados(sabadosData)
        setRegistros(registrosData)
      })
      .finally(() => setLoading(false))
  }, [])

  const activeNinos = useMemo(() => ninos.filter(n => n.activo), [ninos])
  const yearOptions = Array.from({ length: currentYear - 2021 + 1 }, (_, i) => 2021 + i)
  const selectedYears = yearOptions.filter(y => y >= startYear && y <= endYear)

  const yearlyData = selectedYears.map(year => {
    const sabadosYear = filterSabadosByYear(sabados, year)
    const sabadoIds = new Set(sabadosYear.map(s => s.id))
    const ninoIdsWithRecords = new Set(registros.filter(r => sabadoIds.has(r.sabadoId)).map(r => r.ninoId))
    return {
      year,
      asistencia: attendanceRate(sabadoIds, registros.filter(r => activeNinos.some(n => n.id === r.ninoId)), activeNinos.length),
      janijim: ninoIdsWithRecords.size || activeNinos.length,
      sabados: sabadosYear.length,
    }
  })

  const byKvutza = grupos.map(grupo => ({
    nombre: grupo.nombre,
    janijim: activeNinos.filter(n => n.grupoId === grupo.id).length,
  }))

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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h2 className="text-2xl font-bold text-slate-900">Estadísticas</h2>
          <div className="flex items-center gap-2">
            <select value={startYear} onChange={e => setStartYear(Number(e.target.value))} className="h-8 rounded-lg border bg-white px-2 text-sm">
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className="text-sm text-slate-500">a</span>
            <select value={endYear} onChange={e => setEndYear(Number(e.target.value))} className="h-8 rounded-lg border bg-white px-2 text-sm">
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-slate-700 mb-4">Asistencia promedio por año</p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="asistencia" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-slate-700 mb-4">Janijim activos por kvutza</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byKvutza}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="janijim" fill="#16a34a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-slate-700 mb-4">Tendencia histórica</p>
            <Table>
              <TableHeader><TableRow><TableHead>Año</TableHead><TableHead>Asistencia</TableHead><TableHead>Janijim</TableHead><TableHead>Sábados</TableHead></TableRow></TableHeader>
              <TableBody>
                {yearlyData.map(row => (
                  <TableRow key={row.year} className="transition-colors duration-100 hover:bg-slate-50">
                    <TableCell>{row.year}</TableCell>
                    <TableCell>{row.asistencia}%</TableCell>
                    <TableCell>{row.janijim}</TableCell>
                    <TableCell>{row.sabados}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageFade>
  )
}
