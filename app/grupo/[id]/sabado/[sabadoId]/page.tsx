'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getSabadosByGrupo,
  getJanijimByGrupo,
  getAsistenciaBySabado,
  batchSaveAsistencia,
  deleteSabado,
} from '@/lib/firestore'
import type { Sabado, Janij, RegistroAsistencia } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Save, Trash2, Users, Percent, DollarSign } from 'lucide-react'

interface Props {
  params: Promise<{ id: string; sabadoId: string }>
}

interface RowState {
  asistio: boolean
  deuda: string
}

export default function SabadoDetailPage({ params }: Props) {
  const { id: grupoId, sabadoId } = use(params)
  const router = useRouter()

  const [sabado, setSabado] = useState<Sabado | null>(null)
  const [janijim, setJanijim] = useState<Janij[]>([])
  const [rows, setRows] = useState<Record<string, RowState>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const [sabados, jans, asistencia] = await Promise.all([
        getSabadosByGrupo(grupoId),
        getJanijimByGrupo(grupoId),
        getAsistenciaBySabado(sabadoId),
      ])

      setSabado(sabados.find(s => s.id === sabadoId) ?? null)

      const sorted = jans.sort((a, b) => a.apellido.localeCompare(b.apellido))
      setJanijim(sorted)

      const asistenciaMap: Record<string, RegistroAsistencia> = {}
      asistencia.forEach(r => { asistenciaMap[r.janijId] = r })

      const initialRows: Record<string, RowState> = {}
      sorted.forEach(j => {
        const existing = asistenciaMap[j.id]
        initialRows[j.id] = {
          asistio: existing?.asistio ?? false,
          deuda: existing?.deuda != null ? String(existing.deuda) : '',
        }
      })
      setRows(initialRows)
      if (asistencia.length > 0) setSaved(true)
      setLoading(false)
    }
    load()
  }, [grupoId, sabadoId])

  function toggleAsistio(janijId: string) {
    setRows(r => ({ ...r, [janijId]: { ...r[janijId], asistio: !r[janijId].asistio } }))
    setSaved(false)
  }

  function setDeuda(janijId: string, value: string) {
    setRows(r => ({ ...r, [janijId]: { ...r[janijId], deuda: value } }))
    setSaved(false)
  }

  async function handleSave() {
    if (!sabado) return
    setSaving(true)
    const registros = janijim.map(j => ({
      janijId: j.id,
      sabadoId,
      grupoId,
      asistio: rows[j.id]?.asistio ?? false,
      deuda: Number(rows[j.id]?.deuda ?? 0),
    }))
    await batchSaveAsistencia(registros)
    setSaved(true)
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este sábado? Se perderán los registros de asistencia.')) return
    await deleteSabado(sabadoId)
    router.push(`/grupo/${grupoId}`)
  }

  const asistentes = Object.values(rows).filter(r => r.asistio).length
  const pctAsistencia = janijim.length > 0 ? Math.round((asistentes / janijim.length) * 100) : 0
  const totalDeuda = Object.values(rows).reduce((sum, r) => sum + Number(r.deuda || 0), 0)

  if (loading) return <p className="text-slate-500 text-sm p-4">Cargando...</p>
  if (!sabado) return <p className="text-red-500 text-sm p-4">Sábado no encontrado.</p>

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/grupo/${grupoId}`)}
          className="text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-900">{sabado.fecha}</h2>
          {sabado.observacion && (
            <p className="text-sm text-slate-500">{sabado.observacion}</p>
          )}
        </div>
        <button onClick={handleDelete} className="text-red-400 hover:text-red-600">
          <Trash2 size={18} />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold">{asistentes}/{janijim.length}</p>
            <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
              <Users size={11} /> Asistentes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold">{pctAsistencia}%</p>
            <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
              <Percent size={11} /> Asistencia
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold">${totalDeuda}</p>
            <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
              <DollarSign size={11} /> Deuda
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] text-xs font-semibold text-slate-500 px-4 py-2 border-b bg-slate-50">
          <span>Janij</span>
          <span className="w-16 text-center">Asistió</span>
          <span className="w-20 text-center">Deuda $</span>
        </div>
        {janijim.map(j => (
          <div
            key={j.id}
            className="grid grid-cols-[1fr_auto_auto] items-center px-4 py-3 border-b last:border-b-0"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">{j.apellido}, {j.nombre}</p>
              {j.escuela && <p className="text-xs text-slate-400">{j.escuela}</p>}
            </div>
            <div className="w-16 flex justify-center">
              <Checkbox
                checked={rows[j.id]?.asistio ?? false}
                onCheckedChange={() => toggleAsistio(j.id)}
              />
            </div>
            <div className="w-20">
              <Input
                type="number"
                min="0"
                className="h-8 text-sm text-center"
                value={rows[j.id]?.deuda ?? ''}
                onChange={e => setDeuda(j.id, e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Save button */}
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar asistencia'}
        {!saving && !saved && <Save size={16} className="ml-2" />}
      </Button>
    </div>
  )
}
