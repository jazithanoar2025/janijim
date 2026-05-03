'use client'

import { useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { PageFade } from '@/components/ui/page-fade'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getAllNinos, getGrupos } from '@/lib/firestore'
import { isActiveNino } from '@/lib/metrics'
import type { Nino } from '@/lib/types'

interface Row extends Nino {
  grupoNombre: string
}

export default function JanijimPage() {
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [onlyActive, setOnlyActive] = useState(true)
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    Promise.all([getAllNinos(), getGrupos()])
      .then(([ninos, grupos]) => {
        const grupoMap = new Map(grupos.map(g => [g.id, g.nombre]))
        setRows(ninos.map(n => ({ ...n, grupoNombre: grupoMap.get(n.grupoId) ?? n.grupoId })))
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => rows.filter(row => {
    const text = `${row.nombre} ${row.apellido} ${row.grupoNombre} ${row.escuela ?? ''}`.toLowerCase()
    return text.includes(query.toLowerCase()) && (!onlyActive || isActiveNino(row))
  }), [rows, query, onlyActive])

  if (loading) return <PageFade>{[0, 1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse mb-2" />)}</PageFade>

  return (
    <PageFade>
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Janijim</h2>
          <p className="text-xs text-slate-500">{filtered.length} janijim</p>
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <Input placeholder="Buscar..." value={query} onChange={e => setQuery(e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={onlyActive} onChange={e => setOnlyActive(e.target.checked)} />
            Solo activos
          </label>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Kvutza</TableHead><TableHead>Escuela</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map(row => (
              <TableRow key={row.id} className="transition-colors duration-100 hover:bg-slate-50">
                <TableCell>{row.nombre} {row.apellido}</TableCell>
                <TableCell>{row.grupoNombre}</TableCell>
                <TableCell>{row.escuela ?? '-'}</TableCell>
                <TableCell>{isActiveNino(row) ? 'Activo' : 'Inactivo'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageFade>
  )
}
