'use client'

import { use, useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { PageFade } from '@/components/ui/page-fade'
import { getAllSabados, getAppConfig, getNinosByGrupo, getRegistrosByNinos } from '@/lib/firestore'
import { countAttendanceForSabado, countPaidForSabado, filterSabadosByYear, getYears } from '@/lib/metrics'
import type { Nino, Registro, Sabado } from '@/lib/types'

interface Props {
  params: Promise<{ id: string }>
}

export default function GrupoDashboardPage({ params }: Props) {
  const { id } = use(params)
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [sabados, setSabados] = useState<Sabado[]>([])
  const [ninos, setNinos] = useState<Nino[]>([])
  const [registros, setRegistros] = useState<Registro[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([getAllSabados(), getNinosByGrupo(id), getAppConfig()])
      .then(async ([sabadosData, ninosData, config]) => {
        if (cancelled) return
        const active = ninosData.filter(n => n.activo)
        const registrosData = await getRegistrosByNinos(active.map(n => n.id))
        if (cancelled) return
        setSabados(sabadosData)
        setNinos(active)
        setRegistros(registrosData)
        setYear(config.añoActivo)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [id])

  const ninoIds = useMemo(() => new Set(ninos.map(n => n.id)), [ninos])
  const years = useMemo(() => getYears(sabados, year), [sabados, year])
  const chartData = useMemo(() => filterSabadosByYear(sabados, year).slice().reverse().map(sabado => {
    const vinieron = countAttendanceForSabado(sabado.id, ninoIds, registros)
    const pagaron = countPaidForSabado(sabado.id, ninoIds, registros)
    return {
      fecha: sabado.fecha.slice(5),
      asistencia: ninos.length ? Math.round((vinieron / ninos.length) * 100) : 0,
      pagos: vinieron ? Math.round((pagaron / vinieron) * 100) : 0,
    }
  }), [sabados, year, ninoIds, registros, ninos.length])

  if (loading) return <PageFade><div className="h-48 bg-slate-100 rounded-xl animate-pulse" /></PageFade>

  return (
    <PageFade>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Dashboard</h2>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="h-8 rounded-lg border bg-white px-2 text-sm">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-slate-700 mb-4">Asistencia por sábado</p>
            <ResponsiveContainer width="100%" height={220}>
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
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-slate-700 mb-4">Pagos entre quienes vinieron</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="pagos" fill="#16a34a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </PageFade>
  )
}
