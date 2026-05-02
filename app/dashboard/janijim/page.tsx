'use client'

import { useEffect, useState, useMemo } from 'react'
import { getAllJanijim, getGrupos } from '@/lib/firestore'
import type { Janij } from '@/lib/types'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface JanijRow extends Janij {
  grupoNombre: string
}

export default function JanijimPage() {
  const [rows, setRows] = useState<JanijRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([getAllJanijim(), getGrupos()])
      .then(([janijim, grupos]) => {
        if (cancelled) return
        const grupoMap = new Map<string, string>(grupos.map(g => [g.id, g.nombre]))
        setRows(
          janijim.map(j => ({ ...j, grupoNombre: grupoMap.get(j.grupoId) ?? j.grupoId }))
        )
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load janijim:', err)
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    if (!search) return rows
    const q = search.toLowerCase()
    return rows.filter(
      j =>
        j.nombre.toLowerCase().includes(q) ||
        j.apellido.toLowerCase().includes(q) ||
        j.grupoNombre.toLowerCase().includes(q)
    )
  }, [rows, search])

  if (loading) return <p className="text-slate-500 text-sm">Cargando...</p>

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Janijim</h2>

      <Input
        placeholder="Buscar por nombre o grupo..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <p className="text-xs text-slate-500">{filtered.length} janijim</p>

      <div className="bg-white border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead>Escuela</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(j => (
              <TableRow key={j.id}>
                <TableCell className="font-medium">
                  {j.nombre} {j.apellido}
                </TableCell>
                <TableCell className="text-slate-600">{j.grupoNombre}</TableCell>
                <TableCell className="text-slate-600">{j.escuela ?? '—'}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-slate-400">
                  Sin resultados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
