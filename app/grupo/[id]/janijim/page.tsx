'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { getJanijimByGrupo, addJanij, updateJanij, deleteJanij } from '@/lib/firestore'
import type { Janij } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pencil, Trash2, UserPlus } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

const EMPTY_FORM = { nombre: '', apellido: '', escuela: '', telefono: '', observaciones: '' }

export default function JanijimGrupoPage({ params }: Props) {
  const { id } = use(params)
  const [janijim, setJanijim] = useState<Janij[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Janij | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = await getJanijimByGrupo(id)
      setJanijim(data.sort((a, b) => a.apellido.localeCompare(b.apellido)))
    } catch (err) {
      console.error('Failed to load janijim:', err)
      setError('No se pudieron cargar los janijim.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setOpen(true)
  }

  function openEdit(j: Janij) {
    setEditing(j)
    setForm({
      nombre: j.nombre,
      apellido: j.apellido,
      escuela: j.escuela ?? '',
      telefono: j.telefono ?? '',
      observaciones: j.observaciones ?? '',
    })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.nombre.trim() || !form.apellido.trim()) return
    setSaving(true)
    setError(null)
    try {
      const data: Omit<Janij, 'id'> = {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        grupoId: id,
        ...(form.escuela.trim() && { escuela: form.escuela.trim() }),
        ...(form.telefono.trim() && { telefono: form.telefono.trim() }),
        ...(form.observaciones.trim() && { observaciones: form.observaciones.trim() }),
      }
      if (editing) {
        await updateJanij(editing.id, data)
      } else {
        await addJanij(data)
      }
      await load()
      setOpen(false)
    } catch (err) {
      console.error('Failed to save janij:', err)
      setError('No se pudo guardar el janij.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(j: Janij) {
    if (!confirm(`¿Eliminar a ${j.nombre} ${j.apellido}?`)) return
    setError(null)
    try {
      await deleteJanij(j.id)
      await load()
    } catch (err) {
      console.error('Failed to delete janij:', err)
      setError('No se pudo eliminar el janij.')
    }
  }

  if (loading) return <p className="text-slate-500 text-sm p-4">Cargando...</p>

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Janijim</h2>
        <Button size="sm" onClick={openAdd}>
          <UserPlus size={16} className="mr-1" /> Agregar
        </Button>
      </div>

      {janijim.length === 0 && (
        <p className="text-sm text-slate-400">No hay janijim en este grupo.</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-2">
        {janijim.map(j => (
          <div
            key={j.id}
            className="flex items-center justify-between bg-white border rounded-lg px-4 py-3"
          >
            <div>
              <p className="font-medium text-slate-900">{j.apellido}, {j.nombre}</p>
              {j.escuela && <p className="text-xs text-slate-500">{j.escuela}</p>}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => openEdit(j)}>
                <Pencil size={15} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(j)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={15} />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Janij' : 'Nuevo Janij'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                />
              </div>
              <div>
                <Label>Apellido *</Label>
                <Input
                  value={form.apellido}
                  onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Escuela</Label>
              <Input
                value={form.escuela}
                onChange={e => setForm(f => ({ ...f, escuela: e.target.value }))}
              />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input
                value={form.telefono}
                onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
              />
            </div>
            <div>
              <Label>Observaciones</Label>
              <Input
                value={form.observaciones}
                onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={saving || !form.nombre.trim() || !form.apellido.trim()}
              className="w-full"
            >
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Agregar Janij'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
