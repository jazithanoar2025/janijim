'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bell, UsersRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PageFade } from '@/components/ui/page-fade'
import { formatNinoEscuela } from '@/lib/escuelas'
import { getAllNinos, getAllSabados, getAppConfig, getGrupos, getRegistrosBySabados, getUsuarios } from '@/lib/firestore'
import { computeAlerts, type Alerta } from '@/lib/alerts'
import { filterSabadosByYear, isNuevoNino } from '@/lib/metrics'
import type { Grupo } from '@/lib/types'

interface AlertRow extends Alerta {
  grupoNombre: string
}

export default function AlertasGeneralesPage() {
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState<AlertRow[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [grupoId, setGrupoId] = useState('todos')
  const [onlyNew, setOnlyNew] = useState(false)
  const [umbral, setUmbral] = useState(0)
  const [responsableEmails, setResponsableEmails] = useState(new Set<string>())
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getAllSabados(), getAllNinos(), getAppConfig(), getGrupos(), getUsuarios()])
      .then(async ([sabados, ninos, config, gruposData, usuarios]) => {
        const registros = await getRegistrosBySabados(filterSabadosByYear(sabados, config.añoActivo).map(s => s.id))
        const grupoMap = new Map(gruposData.map(g => [g.id, g.nombre]))
        setGrupos(gruposData)
        setUmbral(config.umbralFidelidadAlerta)
        setResponsableEmails(new Set(usuarios.filter(u => u.rol === 'admin').map(u => u.email.trim().toLowerCase())))
        setAlerts(computeAlerts(sabados, ninos, registros, config.umbralFidelidadAlerta, config.añoActivo)
          .map(alert => ({ ...alert, grupoNombre: grupoMap.get(alert.nino.grupoId) ?? alert.nino.grupoId })))
      })
      .catch(err => {
        console.error('Failed to load general alerts:', err)
        setError('No se pudieron cargar las alertas.')
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => alerts.filter(alert => {
    const groupOk = grupoId === 'todos' || alert.nino.grupoId === grupoId
    const newOk = !onlyNew || isNuevoNino(alert.nino, responsableEmails)
    return groupOk && newOk
  }), [alerts, grupoId, onlyNew, responsableEmails])

  if (loading) return <PageFade>{[0, 1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse mb-2" />)}</PageFade>

  return (
    <PageFade>
      <div className="space-y-5">
        <div className="rounded-2xl bg-slate-950 p-5 text-white">
          <div className="flex items-center gap-3">
            <Bell className="text-emerald-300" />
            <div>
              <p className="text-sm text-emerald-200">Alertas generales</p>
              <h2 className="text-2xl font-bold">Baja fidelidad</h2>
              <p className="text-sm text-slate-300">Umbral actual: {umbral}%</p>
            </div>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-[220px_auto]">
          <select value={grupoId} onChange={e => setGrupoId(e.target.value)} className="h-9 rounded-lg border bg-white px-3 text-sm">
            <option value="todos">Todas las kvutzot</option>
            {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
          <label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm text-slate-600">
            <input type="checkbox" checked={onlyNew} onChange={e => setOnlyNew(e.target.checked)} />
            Sólo janijim nuevos
          </label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {filtered.length === 0 && <div className="rounded-xl border bg-white p-4 text-sm text-slate-500">Todos los janijim superan el umbral de fidelidad con esos filtros.</div>}
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map(({ nino, fidelidad, asistencias, faltasConsecutivas, ultimaAsistencia, severity, grupoNombre }) => (
            <div key={nino.id} className="rounded-2xl border bg-white p-4 shadow-sm transition-colors duration-100 hover:bg-slate-50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{nino.nombre} {nino.apellido}</p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><UsersRound size={14} /> {grupoNombre} · {formatNinoEscuela(nino)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {asistencias} asistencias · {faltasConsecutivas} faltas seguidas
                    {ultimaAsistencia ? ` · Última: ${new Date(`${ultimaAsistencia}T00:00:00`).toLocaleDateString('es-UY')}` : ' · Sin asistencias'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {isNuevoNino(nino, responsableEmails) && <Badge className="bg-blue-500">Nuevo</Badge>}
                    {nino.activo === false && <Badge className="bg-zinc-500">Oculto</Badge>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-950">{fidelidad}%</p>
                  <p className="text-xs text-slate-500">fidelidad</p>
                  <Badge className={severity === 'critical' ? 'bg-red-500' : 'bg-yellow-500'}>
                    {severity === 'critical' ? 'Crítica' : 'Atención'}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageFade>
  )
}
