'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageFade } from '@/components/ui/page-fade'
import { getGrupos, getUsuarios } from '@/lib/firestore'
import type { Grupo, Usuario } from '@/lib/types'

export default function UsuariosPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [form, setForm] = useState({ username: '', nombre: '', password: '', grupoId: '' })
  const [error, setError] = useState('')

  async function load() {
    const [usuariosData, gruposData] = await Promise.all([getUsuarios(), getGrupos()])
    setUsuarios(usuariosData)
    setGrupos(gruposData)
    setForm(prev => ({ ...prev, grupoId: prev.grupoId || gruposData[0]?.id || '' }))
  }

  useEffect(() => {
    load().catch(err => {
      console.error('Failed to load users:', err)
      setError('No se pudieron cargar los usuarios.')
    }).finally(() => setLoading(false))
  }, [])

  const grupoMap = useMemo(() => new Map(grupos.map(g => [g.id, g.nombre])), [grupos])
  const admins = usuarios.filter(u => u.rol === 'admin')
  const superadmins = usuarios.filter(u => u.rol === 'superadmin')

  async function handleCreate() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo crear el responsable.')
      setForm({ username: '', nombre: '', password: '', grupoId: grupos[0]?.id || '' })
      await load()
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el responsable.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageFade>{[0, 1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse mb-2" />)}</PageFade>

  return (
    <PageFade>
      <div className="space-y-5">
        <h2 className="text-2xl font-bold text-slate-900">Responsables</h2>
        <Card>
          <CardContent className="p-4 grid md:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-end">
            <div><Label>Usuario</Label><Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></div>
            <div><Label>Nombre</Label><Input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
            <div><Label>Contraseña</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
            <div>
              <Label>Kvutza</Label>
              <select value={form.grupoId} onChange={e => setForm({ ...form, grupoId: e.target.value })} className="h-8 w-full rounded-lg border bg-white px-2 text-sm">
                {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </div>
            <Button onClick={handleCreate} disabled={saving} className={`transition-all duration-200 ${saved ? 'bg-green-600 text-white' : ''}`}>
              <Plus size={16} /> {saving ? 'Creando...' : saved ? '¡Guardado!' : 'Crear'}
            </Button>
          </CardContent>
        </Card>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <section className="space-y-2">
          <h3 className="font-semibold text-slate-900">Admins</h3>
          {admins.map(u => (
            <div key={u.uid} className="rounded-xl border bg-white p-4 transition-colors duration-100 hover:bg-slate-50">
              <p className="font-semibold text-slate-900">{u.nombre}</p>
              <p className="text-sm text-slate-500">{u.email.replace('@jazit.local', '')} · {u.grupoId ? grupoMap.get(u.grupoId) ?? u.grupoId : '-'}</p>
            </div>
          ))}
        </section>
        <section className="space-y-2">
          <h3 className="font-semibold text-slate-900">Superadmins</h3>
          {superadmins.map(u => (
            <div key={u.uid} className="rounded-xl border bg-white p-4 text-sm text-slate-600">
              {u.nombre} · {u.email.replace('@jazit.local', '')}
            </div>
          ))}
        </section>
      </div>
    </PageFade>
  )
}
