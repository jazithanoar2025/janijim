'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PageFade } from '@/components/ui/page-fade'
import { getAllNinos, getAllSabados, getGrupos, getRegistrosBySabado } from '@/lib/firestore'
import { countAttendanceForSabado, countPaidForSabado, isActiveNino } from '@/lib/metrics'
import type { Grupo, Nino, Registro, Sabado } from '@/lib/types'

export default function SabadoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [sabado, setSabado] = useState<Sabado | null>(null)
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [ninos, setNinos] = useState<Nino[]>([])
  const [registros, setRegistros] = useState<Registro[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getAllSabados(), getGrupos(), getAllNinos(), getRegistrosBySabado(id)])
      .then(([sabados, gruposData, ninosData, registrosData]) => {
        setSabado(sabados.find(s => s.id === id) ?? null)
        setGrupos(gruposData)
        setNinos(ninosData.filter(isActiveNino))
        setRegistros(registrosData)
      })
      .catch(err => {
        console.error('Failed to load sabado detail:', err)
        setError('No se pudo cargar la asistencia del sábado.')
      })
      .finally(() => setLoading(false))
  }, [id])

  const registrosByNino = useMemo(() => new Map(registros.map(r => [r.ninoId, r])), [registros])
  const allIds = useMemo(() => new Set(ninos.map(n => n.id)), [ninos])
  const totalVinieron = countAttendanceForSabado(id, allIds, registros)
  const totalPagaron = countPaidForSabado(id, allIds, registros)

  if (loading) return <PageFade><div className="h-48 bg-slate-100 rounded-xl animate-pulse" /></PageFade>

  return (
    <PageFade>
      <div className="space-y-5">
        <Link href="/dashboard/sabados" className="inline-flex items-center gap-1 text-sm text-slate-500"><ArrowLeft size={16} /> Sábados</Link>
        <div className="rounded-2xl bg-slate-950 p-5 text-white">
          <p className="text-sm text-emerald-200">Detalle de asistencia</p>
          <h2 className="text-2xl font-bold">{sabado ? new Date(`${sabado.fecha}T00:00:00`).toLocaleDateString('es-UY') : 'Sábado'}</h2>
          <p className="mt-1 text-sm text-slate-300">{totalVinieron} vinieron · {totalPagaron} pagaron · ${sabado?.monto ?? 0}</p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid gap-4">
          {grupos.map(grupo => {
            const grupoNinos = ninos.filter(n => n.grupoId === grupo.id).sort((a, b) => a.apellido.localeCompare(b.apellido))
            const ids = new Set(grupoNinos.map(n => n.id))
            const vinieron = countAttendanceForSabado(id, ids, registros)
            const pagaron = countPaidForSabado(id, ids, registros)
            const pct = grupoNinos.length ? Math.round((vinieron / grupoNinos.length) * 100) : 0
            return (
              <Card key={grupo.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-950">{grupo.nombre}</h3>
                      <p className="text-sm text-slate-500">{vinieron}/{grupoNinos.length} vinieron · {pagaron} pagaron</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-950">{pct}%</p>
                      <p className="text-xs text-slate-500">asistencia</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {grupoNinos.map(nino => {
                      const registro = registrosByNino.get(nino.id)
                      return (
                        <div key={nino.id} className="rounded-xl border p-3">
                          <p className="font-medium text-slate-900">{nino.apellido}, {nino.nombre}</p>
                          <p className="text-xs text-slate-500">{nino.escuela || 'Sin escuela'}</p>
                          <div className="mt-2 flex gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${registro?.vino ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{registro?.vino ? 'Vino' : 'No vino'}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${registro?.pago ? 'bg-blue-50 text-blue-700' : registro?.vino ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500'}`}>{registro?.pago ? 'Pagó' : registro?.vino ? 'Debe' : 'Sin pago'}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </PageFade>
  )
}
