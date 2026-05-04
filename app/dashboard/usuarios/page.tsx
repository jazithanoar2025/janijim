'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageFade } from '@/components/ui/page-fade'
import { getFirebaseAuth } from '@/lib/firebase'
import type { Grupo, Usuario } from '@/lib/types'

interface UsuarioRow extends Usuario {
  authStatus?: 'ok' | 'missing-auth' | 'error'
  disabled?: boolean | null
  lastSignInTime?: string | null
}

export default function UsuariosPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [form, setForm] = useState({ username: '', nombre: '', password: '', grupoId: '' })
  const [error, setError] = useState('')
  const currentUid = getFirebaseAuth().currentUser?.uid

  const authHeaders = useCallback(async () => {
    const token = await getFirebaseAuth().currentUser?.getIdToken()
    if (!token) throw new Error('Sesión expirada. Volvé a iniciar sesión.')
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  }, [])

  const load = useCallback(async () => {
    const res = await fetch('/api/usuarios', { headers: await authHeaders() })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'No se pudieron cargar los usuarios.')
    setUsuarios(data.usuarios ?? [])
    setGrupos(data.grupos ?? [])
    setForm(prev => ({ ...prev, grupoId: prev.grupoId || data.grupos?.[0]?.id || '' }))
  }, [authHeaders])

  useEffect(() => {
    load().catch(err => {
      console.error('Failed to load users:', err)
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios.')
    }).finally(() => setLoading(false))
  }, [load])

  const grupoMap = useMemo(() => new Map(grupos.map(g => [g.id, g.nombre])), [grupos])
  const admins = usuarios.filter(u => u.rol === 'admin')
  const superadmins = usuarios.filter(u => u.rol === 'superadmin')

  async function handleCreate() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: await authHeaders(),
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

  async function patchUser(payload: { uid: string; password?: string; nombre?: string; grupoId?: string; disabled?: boolean }) {
    const res = await fetch('/api/usuarios', {
      method: 'PATCH',
      headers: await authHeaders(),
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'No se pudo actualizar el usuario.')
    await load()
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  async function resetPassword(uid: string) {
    const password = window.prompt('Nueva contraseña temporal')
    if (!password) return
    setError('')
    try {
      await patchUser({ uid, password, disabled: false })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo resetear la contraseña.')
    }
  }

  async function editUser(user: UsuarioRow) {
    const nombre = window.prompt('Nombre visible', user.nombre)
    if (!nombre) return
    let grupoId = user.grupoId ?? undefined
    if (user.rol === 'admin') {
      const nextGrupo = window.prompt('ID de kvutza', user.grupoId ?? '')
      if (!nextGrupo) return
      grupoId = nextGrupo
    }
    setError('')
    try {
      await patchUser({ uid: user.uid, nombre, grupoId })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo editar el usuario.')
    }
  }

  const renderStatus = (u: UsuarioRow) => {
    if (u.authStatus === 'missing-auth') return <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">Sin Auth</span>
    if (u.disabled) return <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-semibold text-yellow-700">Deshabilitado</span>
    return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">OK</span>
  }

  if (loading) return <PageFade>{[0, 1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse mb-2" />)}</PageFade>

  return (
    <PageFade>
      <div className="space-y-5">
        <div className="rounded-2xl bg-slate-950 p-5 text-white">
          <p className="text-sm text-emerald-200">Acceso y responsables</p>
          <h2 className="text-2xl font-bold">Usuarios</h2>
          <p className="text-sm text-slate-300">Crear, reparar, editar y resetear accesos de admins y superadmins.</p>
        </div>
        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_1fr_1fr_auto] md:items-end">
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
              <Plus size={16} /> {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Crear/Reparar'}
            </Button>
          </CardContent>
        </Card>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <section className="space-y-2">
          <h3 className="font-semibold text-slate-900">Admins</h3>
          {admins.map(u => (
            <div key={u.uid} className="rounded-xl border bg-white p-4 transition-colors duration-100 hover:bg-slate-50">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{u.nombre}</p>
                    {renderStatus(u)}
                  </div>
                  <p className="text-sm text-slate-500">{u.email.replace('@jazit.local', '')} · {u.grupoId ? grupoMap.get(u.grupoId) ?? u.grupoId : '-'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => editUser(u)}>Editar</Button>
                  <Button size="sm" variant="outline" onClick={() => resetPassword(u.uid)}>Resetear acceso</Button>
                </div>
              </div>
            </div>
          ))}
        </section>
        <section className="space-y-2">
          <h3 className="font-semibold text-slate-900">Superadmins</h3>
          {superadmins.map(u => (
            <div key={u.uid} className="rounded-xl border bg-white p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    <p className="font-semibold text-slate-900">{u.nombre}</p>
                    {u.uid === currentUid && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">Tu usuario</span>}
                    {renderStatus(u)}
                  </div>
                  <p className="text-sm text-slate-500">{u.email.replace('@jazit.local', '')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => editUser(u)}>Editar nombre</Button>
                  <Button size="sm" variant="outline" onClick={() => resetPassword(u.uid)}>Cambiar contraseña</Button>
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </PageFade>
  )
}
