'use client'

import { useEffect, useState } from 'react'
import { getAllJanijim, getGrupos, getAllSabados, getAllAsistencia } from '@/lib/firestore'
import { Card, CardContent } from '@/components/ui/card'
import { Users, UsersRound, CalendarDays } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface ChartPoint {
  fecha: string
  asistentes: number
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ janijim: 0, grupos: 0, sabados: 0 })
  const [chartData, setChartData] = useState<ChartPoint[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([getAllJanijim(), getGrupos(), getAllSabados(), getAllAsistencia()])
      .then(([janijim, grupos, sabados, asistencia]) => {
        if (cancelled) return
        const asistioMap = new Map<string, number>()
        for (const a of asistencia) {
          if (a.asistio) {
            asistioMap.set(a.sabadoId, (asistioMap.get(a.sabadoId) ?? 0) + 1)
          }
        }
        const last8 = sabados.slice(0, 8).reverse()
        const chart: ChartPoint[] = last8.map(s => ({
          fecha: s.fecha.slice(5),
          asistentes: asistioMap.get(s.id) ?? 0,
        }))
        setStats({ janijim: janijim.length, grupos: grupos.length, sabados: sabados.length })
        setChartData(chart)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load dashboard:', err)
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  if (loading) return <p className="text-slate-500 text-sm">Cargando...</p>

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users size={20} className="text-slate-500" />
            <div>
              <p className="text-2xl font-bold">{stats.janijim}</p>
              <p className="text-xs text-slate-500">Janijim</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <UsersRound size={20} className="text-slate-500" />
            <div>
              <p className="text-2xl font-bold">{stats.grupos}</p>
              <p className="text-xs text-slate-500">Grupos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CalendarDays size={20} className="text-slate-500" />
            <div>
              <p className="text-2xl font-bold">{stats.sabados}</p>
              <p className="text-xs text-slate-500">Sábados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-slate-700 mb-4">
              Asistencia — últimos sábados (todos los grupos)
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="asistentes"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
