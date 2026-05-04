'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Edit2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageFade } from '@/components/ui/page-fade'
import { useAuth } from '@/hooks/useAuth'
import { getFirebaseAuth } from '@/lib/firebase'
import { addNino, deleteNino, getNinosByGrupo, updateNino } from '@/lib/firestore'
import { escuelasUruguay, findEscuelaById, findEscuelaByLabel, formatEscuela } from '@/lib/escuelas'
import { isActiveNino } from '@/lib/metrics'
import type { Nino } from '@/lib/types'

const emptyForm = { nombre: '', apellido: '', escuela: '', telefono: '', observaciones: '' }

export default function GestionPage() {
  const { id } = useParams<{ id: string }>()
  const { usuario } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Nino | null>(null)
  const [ninos, setNinos] = useState<Nino[]>([])
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const data = await getNinosByGrupo(id)
    setNinos(data.sort((a, b) => a.apellido.localeCompare(b.apellido)))
  }, [id])

  useEffect(() => {
    load().catch(err => {
      console.error('Failed to load ninos:', err)
      setError('No se pudieron cargar los janijim.')
    }).finally(() => setLoading(false))
  }, [load])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  function openEdit(nino: Nino) {
    const escuela = findEscuelaById(nino.escuelaId)
    setEditing(nino)
    setForm({
      nombre: nino.nombre,
      apellido: nino.apellido,
      escuela: escuela ? formatEscuela(escuela) : nino.escuela ?? '',
      telefono: nino.telefono ?? '',
      observaciones: nino.observaciones ?? '',
    })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.nombre.trim() || !form.apellido.trim()) {
      setError('Nombre y apellido son obligatorios.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const selectedEscuela = findEscuelaByLabel(form.escuela)
      const escuelaValue = selectedEscuela?.nombre ?? form.escuela.trim()
      const data = {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        grupoId: id,
        escuela: escuelaValue,
        escuelaId: selectedEscuela?.id ?? '',
        telefono: form.telefono.trim(),
        observaciones: form.observaciones.trim(),
        activo: editing?.activo ?? true,
        creadoEn: editing?.creadoEn ?? new Date().toISOString(),
        creadoPor: editing?.creadoPor ?? getFirebaseAuth().currentUser?.email ?? '',
        creadoPorRol: editing?.creadoPorRol ?? usuario?.rol ?? 'admin',
      }
      if (editing) await updateNino(editing.id, data)
      else await addNino(data)
      await load()
      setOpen(false)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save nino:', err)
      setError('No se pudo guardar el janij.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActivo(nino: Nino) {
    await updateNino(nino.id, { activo: !isActiveNino(nino) })
    await load()
  }

  async function handleDelete(nino: Nino) {
    if (!confirm(`¿Eliminar a ${nino.nombre} ${nino.apellido}? También se borran sus registros.`)) return
    await deleteNino(nino.id)
    await load()
  }

  if (loading) {
    return (
      <PageFade>
        {[0, 1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse mb-2" />)}
      </PageFade>
    )
  }

  return (
    <PageFade>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Gestión</h2>
            <p className="text-sm text-slate-500">{ninos.length} janijim</p>
          </div>
          <Button onClick={openCreate} className="transition-colors duration-150">
            <Plus size={16} /> Agregar
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Editar janij' : 'Nuevo janij'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div><Label>Nombre</Label><Input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
                <div><Label>Apellido</Label><Input value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} /></div>
                <div>
                  <Label>Escuela</Label>
                  <Input
                    list="escuelas-uruguay"
                    value={form.escuela}
                    onChange={e => setForm({ ...form, escuela: e.target.value })}
                    placeholder="Buscar escuela oficial..."
                  />
                  <datalist id="escuelas-uruguay">
                    {escuelasUruguay.map(escuela => (
                      <option key={escuela.id} value={formatEscuela(escuela)} />
                    ))}
                  </datalist>
                  <p className="mt-1 text-xs text-slate-400">
                    Elegí una opción del catálogo ANEP para evitar duplicados por escritura.
                  </p>
                </div>
                <div><Label>Teléfono</Label><Input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></div>
                <div>
                  <Label>Observaciones</Label>
                  <textarea className="min-h-20 w-full rounded-lg border bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50" value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
                </div>
                <Button onClick={handleSave} disabled={saving} className={`w-full transition-all duration-200 ${saved ? 'bg-green-600 text-white' : ''}`}>
                  {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="space-y-2">
          {ninos.map(nino => (
            <Card key={nino.id} className={`transition-colors duration-100 hover:bg-slate-50 ${!isActiveNino(nino) ? 'opacity-60' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{nino.apellido}, {nino.nombre}</p>
                    <p className="text-xs text-slate-500">{isActiveNino(nino) ? 'En lista' : 'Oculto'}{nino.escuela ? ` · ${nino.escuela}` : ''}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => toggleActivo(nino)} className="transition-colors duration-150">{isActiveNino(nino) ? 'Ocultar' : 'Mostrar'}</Button>
                    <Button size="icon-sm" variant="ghost" onClick={() => openEdit(nino)} className="transition-colors duration-150"><Edit2 size={14} /></Button>
                    <Button size="icon-sm" variant="destructive" onClick={() => handleDelete(nino)} className="transition-colors duration-150"><Trash2 size={14} /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageFade>
  )
}
