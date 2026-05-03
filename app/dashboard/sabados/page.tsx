'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageFade } from '@/components/ui/page-fade'
import { getFirebaseAuth } from '@/lib/firebase'
import { addSabado, deleteSabado, getAllNinos, getAllRegistros, getAllSabados, getAppConfig } from '@/lib/firestore'
import { countAttendanceForSabado, countPaidForSabado, filterSabadosByYear, getYears } from '@/lib/metrics'
import type { Nino, Registro, Sabado } from '@/lib/types'

export default function SabadosAdminPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())
  const [sabados, setSabados] = useState<Sabado[]>([])
  const [ninos, setNinos] = useState<Nino[]>([])
  const [registros, setRegistros] = useState<Registro[]>([])
  const [fecha, setFecha] = useState('')
  const [monto, setMonto] = useState('')
  const [observacion, setObservacion] = useState('')
  const [error, setError] = useState('')

  async function load() {
    const [sabadosData, ninosData, registrosData, config] = await Promise.all([getAllSabados(), getAllNinos(), getAllRegistros(), getAppConfig()])
    setSabados(sabadosData)
    setNinos(ninosData.filter(n => n.activo))
    setRegistros(registrosData)
    setYear(config.añoActivo)
  }

  useEffect(() => {
    load().catch(err => {
      console.error('Failed to load sabados:', err)
      setError('No se pudieron cargar los sábados.')
    }).finally(() => setLoading(false))
  }, [])

  const years = useMemo(() => getYears(sabados, year), [sabados, year])
  const ninoIds = useMemo(() => new Set(ninos.map(n => n.id)), [ninos])
  const sabadosYear = useMemo(() => filterSabadosByYear(sabados, year), [sabados, year])

  async function handleCreate() {
    const parsedMonto = Number(monto)
    if (!fecha || !Number.isFinite(parsedMonto) || parsedMonto < 0) {
      setError('Revisá fecha y monto.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await addSabado({
        fecha,
        monto: parsedMonto,
        observacion: observacion.trim(),
        creadoPor: getFirebaseAuth().currentUser?.email ?? '',
        creadoEn: new Date().toISOString(),
      })
      setFecha('')
      setMonto('')
      setObservacion('')
      await load()
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to create sabado:', err)
      setError('No se pudo crear el sábado.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(sabado: Sabado) {
    if (!confirm(`¿Eliminar el sábado ${sabado.fecha}? Se borran sus registros.`)) return
    await deleteSabado(sabado.id)
    await load()
  }

  if (loading) return <PageFade><div className="h-20 bg-slate-100 rounded-xl animate-pulse mb-4" />{[0, 1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse mb-2" />)}</PageFade>

  return (
    <PageFade>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Sábados</h2>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="h-8 rounded-lg border bg-white px-2 text-sm">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <Card>
          <CardContent className="p-4 grid md:grid-cols-[1fr_120px_1fr_auto] gap-3 items-end">
            <div><Label>Fecha</Label><Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></div>
            <div><Label>Monto</Label><Input type="number" value={monto} onChange={e => setMonto(e.target.value)} /></div>
            <div><Label>Observación</Label><Input value={observacion} onChange={e => setObservacion(e.target.value)} /></div>
            <Button onClick={handleCreate} disabled={saving} className={`transition-all duration-200 ${saved ? 'bg-green-600 text-white' : ''}`}>
              <Plus size={16} /> {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Crear'}
            </Button>
          </CardContent>
        </Card>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="space-y-2">
          {sabadosYear.map(sabado => {
            const vinieron = countAttendanceForSabado(sabado.id, ninoIds, registros)
            const pagaron = countPaidForSabado(sabado.id, ninoIds, registros)
            return (
              <div key={sabado.id} className="rounded-xl border bg-white p-4 transition-colors duration-100 hover:bg-slate-50">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{new Date(`${sabado.fecha}T00:00:00`).toLocaleDateString('es-UY')}</p>
                    <p className="text-sm text-slate-500">${sabado.monto} · {vinieron} vinieron · {pagaron} pagaron</p>
                  </div>
                  <Button size="icon-sm" variant="destructive" onClick={() => handleDelete(sabado)} className="transition-colors duration-150"><Trash2 size={14} /></Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </PageFade>
  )
}
