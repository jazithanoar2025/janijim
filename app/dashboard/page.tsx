'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Percent, Users, UsersRound } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { PageFade } from '@/components/ui/page-fade'
import { getAllNinos, getAllRegistros, getAllSabados, getAppConfig, getGrupos } from '@/lib/firestore'
import { attendanceRate, countAttendanceForSabado, filterSabadosByYear, isActiveNino } from '@/lib/metrics'
import type { Nino, Registro, Sabado } from '@/lib/types'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [ninos, setNinos] = useState<Nino[]>([])
  const [gruposCount, setGruposCount] = useState(0)
  const [sabados, setSabados] = useState<Sabado[]>([])
  const [registros, setRegistros] = useState<Registro[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([getAllNinos(), getGrupos(), getAllSabados(), getAllRegistros(), getAppConfig()])
      .then(([ninosData, grupos, sabadosData, registrosData, config]) => {
        if (cancelled) return
        setNinos(ninosData)
        setGruposCount(grupos.length)
        setSabados(sabadosData)
        setRegistros(registrosData)
        setYear(config.añoActivo)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load dashboard:', err)
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const activeNinos = useMemo(() => ninos.filter(isActiveNino), [ninos])
  const activeIds = useMemo(() => new Set(activeNinos.map(n => n.id)), [activeNinos])
  const sabadosYear = useMemo(() => filterSabadosByYear(sabados, year), [sabados, year])
  const registrosActivos = useMemo(() => registros.filter(r => activeIds.has(r.ninoId)), [registros, activeIds])
  const promedio = attendanceRate(new Set(sabadosYear.map(s => s.id)), registrosActivos, activeNinos.length)
  const chartData = sabadosYear.slice().reverse().map(sabado => ({
    fecha: sabado.fecha.slice(5),
    asistencia: activeNinos.length ? Math.round((countAttendanceForSabado(sabado.id, activeIds, registros) / activeNinos.length) * 100) : 0,
  }))

  if (loading) {
    return (
      <PageFade>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
        <div className="h-48 bg-slate-100 rounded-xl animate-pulse" />
      </PageFade>
    )
  }

  return (
    <PageFade>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="flex items-center gap-3 p-4"><Users size={20} className="text-slate-500" /><div><p className="text-2xl font-bold">{activeNinos.length}</p><p className="text-xs text-slate-500">Janijim activos</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-4"><UsersRound size={20} className="text-slate-500" /><div><p className="text-2xl font-bold">{gruposCount}</p><p className="text-xs text-slate-500">Kvutzot</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-4"><CalendarDays size={20} className="text-slate-500" /><div><p className="text-2xl font-bold">{sabadosYear.length}</p><p className="text-xs text-slate-500">Sábados {year}</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-4"><Percent size={20} className="text-slate-500" /><div><p className="text-2xl font-bold">{promedio}%</p><p className="text-xs text-slate-500">Asistencia</p></div></CardContent></Card>
        </div>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-slate-700 mb-4">Asistencia institucional {year}</p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="asistencia" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </PageFade>
  )
}
