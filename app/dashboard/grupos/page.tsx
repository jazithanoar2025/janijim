'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getGrupos, getAllJanijim } from '@/lib/firestore'
import type { Grupo } from '@/lib/types'
import { ChevronRight } from 'lucide-react'

interface GrupoRow {
  grupo: Grupo
  janijimCount: number
}

export default function GruposPage() {
  const router = useRouter()
  const [rows, setRows] = useState<GrupoRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([getGrupos(), getAllJanijim()])
      .then(([grupos, janijim]) => {
        if (cancelled) return
        const countByGrupo = new Map<string, number>()
        for (const j of janijim) {
          countByGrupo.set(j.grupoId, (countByGrupo.get(j.grupoId) ?? 0) + 1)
        }
        setRows(grupos.map(g => ({ grupo: g, janijimCount: countByGrupo.get(g.id) ?? 0 })))
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load grupos:', err)
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  if (loading) return <p className="text-slate-500 text-sm">Cargando...</p>

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Grupos</h2>

      {rows.length === 0 && <p className="text-sm text-slate-400">No hay grupos.</p>}

      <div className="space-y-2">
        {rows.map(({ grupo, janijimCount }) => (
          <button
            key={grupo.id}
            onClick={() => router.push(`/grupo/${grupo.id}`)}
            className="w-full flex items-center justify-between bg-white border rounded-lg p-4 text-left hover:bg-slate-50 transition-colors"
          >
            <div>
              <p className="font-medium text-slate-900">{grupo.nombre}</p>
              <p className="text-xs text-slate-500">{janijimCount} janijim</p>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </button>
        ))}
      </div>
    </div>
  )
}
