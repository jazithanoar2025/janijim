'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageFade } from '@/components/ui/page-fade'
import { getFirebaseAuth } from '@/lib/firebase'
import { batchSaveRegistros, getAllSabados, getNinosByGrupo, getRegistrosBySabadoAndNinos } from '@/lib/firestore'
import { isActiveNino } from '@/lib/metrics'
import type { Nino, Registro, Sabado } from '@/lib/types'

type RowState = Record<string, { vino: boolean; pago: boolean }>

export default function SabadoPage() {
  const { id: grupoId, sabadoId } = useParams<{ id: string; sabadoId: string }>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [sabado, setSabado] = useState<Sabado | null>(null)
  const [ninos, setNinos] = useState<Nino[]>([])
  const [rows, setRows] = useState<RowState>({})

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([getAllSabados(), getNinosByGrupo(grupoId)])
      .then(async ([sabados, ninosData]) => {
        if (cancelled) return
        const selected = sabados.find(s => s.id === sabadoId) ?? null
        const activos = ninosData.filter(isActiveNino).sort((a, b) => a.apellido.localeCompare(b.apellido))
        const registros = await getRegistrosBySabadoAndNinos(sabadoId, activos.map(n => n.id))
        if (cancelled) return
        const byNino = new Map(registros.map((r: Registro) => [r.ninoId, r]))
        const nextRows: RowState = {}
        for (const nino of activos) {
          const existing = byNino.get(nino.id)
          nextRows[nino.id] = { vino: existing?.vino ?? false, pago: existing?.pago ?? false }
        }
        setSabado(selected)
        setNinos(activos)
        setRows(nextRows)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load attendance:', err)
        if (!cancelled) {
          setError('No se pudo cargar la asistencia.')
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [grupoId, sabadoId])

  const asistentes = useMemo(() => Object.values(rows).filter(r => r.vino).length, [rows])
  const pagos = useMemo(() => Object.values(rows).filter(r => r.vino && r.pago).length, [rows])

  function updateRow(ninoId: string, patch: Partial<{ vino: boolean; pago: boolean }>) {
    setRows(prev => {
      const current = prev[ninoId] ?? { vino: false, pago: false }
      const next = { ...current, ...patch }
      if (!next.vino) next.pago = false
      return { ...prev, [ninoId]: next }
    })
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const email = getFirebaseAuth().currentUser?.email ?? ''
      await batchSaveRegistros(ninos.map(nino => ({
        ninoId: nino.id,
        sabadoId,
        vino: rows[nino.id]?.vino ?? false,
        pago: rows[nino.id]?.pago ?? false,
        registradoPor: email,
      })))
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save attendance:', err)
      setError('No se pudo guardar la asistencia.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <PageFade>
        <div className="space-y-3">
          <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          {[0, 1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse mb-2" />)}
        </div>
      </PageFade>
    )
  }

  return (
    <PageFade>
      <div className="space-y-4">
        <Link href={`/grupo/${grupoId}`} className="inline-flex items-center gap-1 text-sm text-slate-500">
          <ArrowLeft size={16} /> Volver
        </Link>

        <Card>
          <CardContent className="p-4">
            <p className="text-lg font-bold text-slate-900">{sabado ? new Date(`${sabado.fecha}T00:00:00`).toLocaleDateString('es-UY') : 'Sábado'}</p>
            <p className="text-sm text-slate-500">{asistentes}/{ninos.length} vinieron · {pagos} pagaron</p>
          </CardContent>
        </Card>

        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="grid grid-cols-[1fr_72px_72px] gap-2 px-3 py-2 text-xs font-semibold uppercase text-slate-500 bg-slate-50">
            <span>Janij</span>
            <span>Vino</span>
            <span>Pagó</span>
          </div>
          {ninos.map(nino => (
            <div key={nino.id} className="grid grid-cols-[1fr_72px_72px] items-center gap-2 px-3 py-3 border-t transition-colors duration-100 hover:bg-slate-50">
              <div>
                <p className="font-medium text-slate-900">{nino.apellido}, {nino.nombre}</p>
                {nino.escuela && <p className="text-xs text-slate-400">{nino.escuela}</p>}
              </div>
              <input
                type="checkbox"
                checked={rows[nino.id]?.vino ?? false}
                onChange={e => updateRow(nino.id, { vino: e.target.checked })}
                className="size-5 transition-transform duration-100 checked:scale-110"
              />
              <input
                type="checkbox"
                checked={rows[nino.id]?.pago ?? false}
                disabled={!rows[nino.id]?.vino}
                onChange={e => updateRow(nino.id, { pago: e.target.checked })}
                className="size-5 transition-transform duration-100 checked:scale-110 disabled:opacity-30"
              />
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button onClick={handleSave} disabled={saving} className={`w-full transition-all duration-200 ${saved ? 'bg-green-600 text-white' : ''}`}>
          <Save size={16} />
          {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar asistencia'}
        </Button>
      </div>
    </PageFade>
  )
}
