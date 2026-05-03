'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { PageFade } from '@/components/ui/page-fade'
import { getAllNinos, getGrupos } from '@/lib/firestore'
import { isActiveNino } from '@/lib/metrics'
import type { Grupo, Nino } from '@/lib/types'

interface Row {
  grupo: Grupo
  janijimCount: number
}

export default function KvutzotPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    Promise.all([getGrupos(), getAllNinos()])
      .then(([grupos, ninos]) => {
        const countByGrupo = new Map<string, number>()
        for (const nino of ninos as Nino[]) {
          if (isActiveNino(nino)) countByGrupo.set(nino.grupoId, (countByGrupo.get(nino.grupoId) ?? 0) + 1)
        }
        setRows(grupos.map(grupo => ({ grupo, janijimCount: countByGrupo.get(grupo.id) ?? 0 })))
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageFade>{[0, 1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse mb-2" />)}</PageFade>

  return (
    <PageFade>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Kvutzot</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {rows.map(({ grupo, janijimCount }) => (
            <Link key={grupo.id} href={`/grupo/${grupo.id}`} className="rounded-xl border bg-white p-4 transition-colors duration-100 hover:bg-slate-50">
              <p className="font-semibold text-slate-900">{grupo.nombre}</p>
              <p className="text-sm text-slate-500">{janijimCount} janijim activos</p>
            </Link>
          ))}
        </div>
      </div>
    </PageFade>
  )
}
