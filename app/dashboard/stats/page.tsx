'use client'

import { useEffect, useState } from 'react'
import { getAllJanijim, getGrupos } from '@/lib/firestore'
import { Card, CardContent } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface GrupoBar {
  nombre: string
  janijim: number
}

interface EscuelaRow {
  escuela: string
  count: number
  pct: string
}

export default function StatsPage() {
  const [loading, setLoading] = useState(true)
  const [grupoData, setGrupoData] = useState<GrupoBar[]>([])
  const [escuelaData, setEscuelaData] = useState<EscuelaRow[]>([])
  const [total, setTotal] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([getAllJanijim(), getGrupos()])
      .then(([janijim, grupos]) => {
        if (cancelled) return
        const countByGrupo = new Map<string, number>()
        const countByEscuela = new Map<string, number>()
        for (const j of janijim) {
          countByGrupo.set(j.grupoId, (countByGrupo.get(j.grupoId) ?? 0) + 1)
          const esc = j.escuela ?? 'Sin escuela'
          countByEscuela.set(esc, (countByEscuela.get(esc) ?? 0) + 1)
        }
        const gData: GrupoBar[] = grupos.map(g => ({
          nombre: g.nombre,
          janijim: countByGrupo.get(g.id) ?? 0,
        }))
        const tot = janijim.length
        const eData: EscuelaRow[] = Array.from(countByEscuela.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([escuela, count]) => ({
            escuela,
            count,
            pct: tot > 0 ? `${Math.round((count / tot) * 100)}%` : '—',
          }))
        setGrupoData(gData)
        setEscuelaData(eData)
        setTotal(tot)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load stats:', err)
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  if (loading) return <p className="text-slate-500 text-sm">Cargando...</p>

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Estadísticas</h2>

      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium text-slate-700 mb-4">Janijim por grupo</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={grupoData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="janijim" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">
          Por escuela ({total} total)
        </p>
        <div className="bg-white border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Escuela</TableHead>
                <TableHead className="text-right">Janijim</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {escuelaData.map(({ escuela, count, pct }) => (
                <TableRow key={escuela}>
                  <TableCell>{escuela}</TableCell>
                  <TableCell className="text-right">{count}</TableCell>
                  <TableCell className="text-right text-slate-500">{pct}</TableCell>
                </TableRow>
              ))}
              {escuelaData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-slate-400">
                    Sin datos
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
