'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Phone } from 'lucide-react'
import { PageFade } from '@/components/ui/page-fade'
import { getAllNinos, getGrupos } from '@/lib/firestore'
import { isActiveNino } from '@/lib/metrics'
import type { Grupo, Nino } from '@/lib/types'

interface Row {
  grupo: Grupo
  janijim: Nino[]
}

export default function KvutzotPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getGrupos(), getAllNinos()])
      .then(([grupos, ninos]) => {
        setRows(grupos
          .slice()
          .sort((a, b) => a.nombre.localeCompare(b.nombre))
          .map(grupo => ({
            grupo,
            janijim: ninos
              .filter(nino => nino.grupoId === grupo.id)
              .sort((a, b) => a.apellido.localeCompare(b.apellido) || a.nombre.localeCompare(b.nombre)),
          })))
      })
      .catch(err => {
        console.error('Failed to load kvutzot:', err)
        setError('No se pudieron cargar las kvutzot.')
      })
      .finally(() => setLoading(false))
  }, [])

  const total = useMemo(() => rows.reduce((sum, row) => sum + row.janijim.filter(isActiveNino).length, 0), [rows])

  if (loading) return <PageFade>{[0, 1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse mb-2" />)}</PageFade>

  return (
    <PageFade>
      <div className="space-y-5">
        <div className="rounded-2xl bg-slate-950 p-5 text-white">
          <p className="text-sm text-emerald-200">Mapa de kvutzot</p>
          <h2 className="text-2xl font-bold">Kvutzot</h2>
          <p className="text-sm text-slate-300">{total} janijim activos distribuidos en {rows.length} kvutzot</p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid gap-4">
          {rows.map(({ grupo, janijim }) => {
            const active = janijim.filter(isActiveNino)
            return (
              <section key={grupo.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-950">{grupo.nombre}</h3>
                    <p className="text-sm text-slate-500">{active.length} activos · {janijim.length - active.length} inactivos</p>
                  </div>
                  <Link href={`/grupo/${grupo.id}`} className="inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-sm font-medium transition-colors duration-150 hover:bg-slate-50">
                    Abrir <ArrowRight size={15} />
                  </Link>
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {janijim.map(nino => (
                    <div key={nino.id} className={`rounded-xl border p-3 transition-colors duration-100 hover:bg-slate-50 ${!isActiveNino(nino) ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-slate-900">{nino.apellido}, {nino.nombre}</p>
                          <p className="text-xs text-slate-500">{nino.escuela || 'Sin escuela'}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${isActiveNino(nino) ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {isActiveNino(nino) ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      {nino.telefono && <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500"><Phone size={12} />{nino.telefono}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </PageFade>
  )
}
