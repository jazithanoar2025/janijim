'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarDays, Percent, Users, UsersRound } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PageFade } from '@/components/ui/page-fade'
import { getAllNinos, getAllRegistros, getAllSabados, getAppConfig, getGrupos } from '@/lib/firestore'
import {
  averageAttendanceCountPerSabado,
  averageJanijFidelity,
  countAttendanceForSabado,
  filterSabadosByYear,
  isActiveNino,
  ninoAttendancePercent,
} from '@/lib/metrics'
import type { Grupo, Nino, Registro, Sabado } from '@/lib/types'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [ninos, setNinos] = useState<Nino[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [sabados, setSabados] = useState<Sabado[]>([])
  const [registros, setRegistros] = useState<Registro[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([getAllNinos(), getGrupos(), getAllSabados(), getAllRegistros(), getAppConfig()])
      .then(([ninosData, gruposData, sabadosData, registrosData, config]) => {
        if (cancelled) return
        setNinos(ninosData)
        setGrupos(gruposData)
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

  const sabadosYear = useMemo(() => filterSabadosByYear(sabados, year), [sabados, year])
  const operationalNinos = useMemo(() => ninos.filter(isActiveNino), [ninos])
  const activeNinos = useMemo(() => operationalNinos.filter(nino => ninoAttendancePercent(nino.id, sabadosYear, registros) > 0), [operationalNinos, sabadosYear, registros])
  const ninoIds = useMemo(() => new Set(operationalNinos.map(n => n.id)), [operationalNinos])
  const fidelidadPromedio = averageJanijFidelity(operationalNinos, sabadosYear, registros)
  const promedioNinos = averageAttendanceCountPerSabado(sabadosYear, ninoIds, registros)
  const chartData = sabadosYear.slice().reverse().map(sabado => ({
    fecha: sabado.fecha.slice(5),
    asistentes: countAttendanceForSabado(sabado.id, ninoIds, registros),
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
        <div className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-sm text-emerald-200">Jazit Hanoar · {year}</p>
          <h2 className="mt-1 text-3xl font-bold">Panel general</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Lectura institucional por cantidad real de janijim: promedio de niños por sábado, fidelidad por janij y distribución por kvutza.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="bg-white"><CardContent className="flex items-center gap-3 p-4"><Users size={20} className="text-slate-500" /><div><p className="text-2xl font-bold">{activeNinos.length}</p><p className="text-xs text-slate-500">Janijim activos</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-4"><UsersRound size={20} className="text-slate-500" /><div><p className="text-2xl font-bold">{grupos.length}</p><p className="text-xs text-slate-500">Kvutzot</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-4"><CalendarDays size={20} className="text-slate-500" /><div><p className="text-2xl font-bold">{sabadosYear.length}</p><p className="text-xs text-slate-500">Sábados</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-4"><Users size={20} className="text-emerald-600" /><div><p className="text-2xl font-bold">{promedioNinos}</p><p className="text-xs text-slate-500">Promedio niños</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-4"><Percent size={20} className="text-blue-600" /><div><p className="text-2xl font-bold">{fidelidadPromedio}%</p><p className="text-xs text-slate-500">Fidelidad janij</p></div></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-slate-700 mb-4">Cantidad de janijim presentes por sábado</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="asistentes" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </PageFade>
  )
}
