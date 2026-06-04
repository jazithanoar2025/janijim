'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, ChevronDown, Phone } from 'lucide-react'
import { PageFade } from '@/components/ui/page-fade'
import { formatNinoEscuela } from '@/lib/escuelas'
import { getAllNinos, getGrupos } from '@/lib/firestore'
import { isNuevoNino } from '@/lib/metrics'
import type { Grupo, Nino } from '@/lib/types'

interface Row {
  grupo: Grupo
  janijim: Nino[]
}

export default function KvutzotPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Row[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
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

  const total = useMemo(() => rows.reduce((sum, row) => sum + row.janijim.length, 0), [rows])

  function toggleGrupo(grupoId: string) {
    setExpandedIds(current => {
      const next = new Set(current)
      if (next.has(grupoId)) next.delete(grupoId)
      else next.add(grupoId)
      return next
    })
  }

  if (loading) return <PageFade>{[0, 1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse mb-2" />)}</PageFade>

  return (
    <PageFade>
      <div className="space-y-5">
        <div className="rounded-2xl bg-slate-950 p-5 text-white">
          <p className="text-sm text-emerald-200">Mapa de kvutzot</p>
          <h2 className="text-2xl font-bold">Kvutzot</h2>
          <p className="text-sm text-slate-300">{total} janijim distribuidos en {rows.length} kvutzot</p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid gap-4">
          {rows.map(({ grupo, janijim }) => {
            const expanded = expandedIds.has(grupo.id)
            return (
              <section key={grupo.id} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => toggleGrupo(grupo.id)}
                    aria-expanded={expanded}
                    className="flex min-w-0 flex-1 items-center gap-3 p-4 text-left transition-colors duration-150 hover:bg-slate-50"
                  >
                    <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform duration-150 ${expanded ? 'rotate-0' : '-rotate-90'}`} />
                    <span className="min-w-0">
                      <span className="block text-lg font-bold text-slate-950">{grupo.nombre}</span>
                      <span className="block text-sm text-slate-500">{janijim.length} janijim cargados</span>
                    </span>
                  </button>
                  <Link href="/dashboard/stats" className="mr-4 inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-sm font-medium transition-colors duration-150 hover:bg-slate-50">
                    Estadísticas <ArrowRight size={15} />
                  </Link>
                </div>
                {expanded && (
                  <div className="grid gap-2 border-t bg-slate-50/50 p-4 md:grid-cols-2 xl:grid-cols-3">
                    {janijim.map(nino => (
                      <div key={nino.id} className={`rounded-xl border bg-white p-3 transition-colors duration-100 hover:bg-slate-50 ${nino.activo === false ? 'opacity-60' : ''}`}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900">{nino.apellido}, {nino.nombre}</p>
                            <p className="break-words text-xs text-slate-500">{formatNinoEscuela(nino)}</p>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-1">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${nino.activo === false ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>
                              {nino.activo === false ? 'Oculto' : 'Operativo'}
                            </span>
                            {isNuevoNino(nino) && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">Nuevo</span>}
                          </div>
                        </div>
                        {nino.telefono && <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500"><Phone size={12} />{nino.telefono}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </PageFade>
  )
}
