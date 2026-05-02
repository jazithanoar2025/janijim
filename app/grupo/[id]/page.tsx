'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSabadosByGrupo, getJanijimByGrupo, addSabado } from '@/lib/firestore'
import type { Sabado, Janij } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CalendarDays, Users, Plus, ChevronRight } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default function GrupoPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()

  const [sabados, setSabados] = useState<Sabado[]>([])
  const [janijim, setJanijim] = useState<Janij[]>([])
  const [loading, setLoading] = useState(true)

  const [open, setOpen] = useState(false)
  const [fecha, setFecha] = useState('')
  const [monto, setMonto] = useState('')
  const [observacion, setObservacion] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([getSabadosByGrupo(id), getJanijimByGrupo(id)]).then(([sabs, jans]) => {
      setSabados(sabs)
      setJanijim(jans)
      setLoading(false)
    })
  }, [id])

  async function handleCreate() {
    if (!fecha || !monto) return
    setSaving(true)
    await addSabado({
      fecha,
      monto: Number(monto),
      ...(observacion && { observacion }),
      grupoId: id,
    })
    const updated = await getSabadosByGrupo(id)
    setSabados(updated)
    setFecha('')
    setMonto('')
    setObservacion('')
    setOpen(false)
    setSaving(false)
  }

  if (loading) return <p className="text-slate-500 text-sm p-4">Cargando...</p>

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Mi Grupo</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus size={16} className="mr-1" /> Nuevo Sábado
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Sábado</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <Label htmlFor="fecha">Fecha</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="monto">Monto ($)</Label>
                <Input
                  id="monto"
                  type="number"
                  min="0"
                  value={monto}
                  onChange={e => setMonto(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="obs">Observación (opcional)</Label>
                <Input
                  id="obs"
                  value={observacion}
                  onChange={e => setObservacion(e.target.value)}
                  placeholder="Tema del encuentro..."
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={saving || !fecha || !monto}
                className="w-full"
              >
                {saving ? 'Guardando...' : 'Crear Sábado'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users size={20} className="text-slate-500" />
            <div>
              <p className="text-2xl font-bold">{janijim.length}</p>
              <p className="text-xs text-slate-500">Janijim</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CalendarDays size={20} className="text-slate-500" />
            <div>
              <p className="text-2xl font-bold">{sabados.length}</p>
              <p className="text-xs text-slate-500">Sábados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sábados list */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-700">Sábados</h3>
        {sabados.length === 0 && (
          <p className="text-sm text-slate-400">No hay sábados registrados.</p>
        )}
        {sabados.map(s => (
          <button
            key={s.id}
            onClick={() => router.push(`/grupo/${id}/sabado/${s.id}`)}
            className="w-full flex items-center justify-between bg-white border rounded-lg p-3 text-left hover:bg-slate-50 transition-colors"
          >
            <div>
              <p className="font-medium text-slate-900">{s.fecha}</p>
              {s.observacion && <p className="text-xs text-slate-500">{s.observacion}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">${s.monto}</span>
              <ChevronRight size={16} className="text-slate-400" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
