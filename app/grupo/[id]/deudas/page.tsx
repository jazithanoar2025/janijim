'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { PageFade } from '@/components/ui/page-fade'
import { Button } from '@/components/ui/button'
import { getFirebaseAuth } from '@/lib/firebase'
import { batchSaveRegistros, getAllSabados, getAppConfig, getNinosByGrupo, getRegistrosByNinos } from '@/lib/firestore'
import { computeDebtRows, filterSabadosByYear, getYears } from '@/lib/metrics'
import type { Nino, Registro, Sabado } from '@/lib/types'

export default function DeudasPage() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [sabados, setSabados] = useState<Sabado[]>([])
  const [ninos, setNinos] = useState<Nino[]>([])
  const [registros, setRegistros] = useState<Registro[]>([])
  const [settling, setSettling] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([getAllSabados(), getNinosByGrupo(id), getAppConfig()])
      .then(async ([sabadosData, ninosData, config]) => {
        if (cancelled) return
        const registrosData = await getRegistrosByNinos(ninosData.map(n => n.id))
        if (cancelled) return
        setSabados(sabadosData)
        setNinos(ninosData)
        setRegistros(registrosData)
        setYear(config.añoActivo)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [id])

  const years = useMemo(() => getYears(sabados, year), [sabados, year])
  const rows = useMemo(() => computeDebtRows(ninos, filterSabadosByYear(sabados, year), registros), [ninos, sabados, year, registros])

  async function handleLiquidar(row: ReturnType<typeof computeDebtRows>[number]) {
    setSettling(row.nino.id)
    try {
      const email = getFirebaseAuth().currentUser?.email ?? ''
      await batchSaveRegistros(row.sabados.map(s => ({
        ninoId: row.nino.id,
        sabadoId: s.id,
        vino: true,
        pago: true,
        registradoPor: email,
      })))
      setRegistros(prev => prev.map(r =>
        r.ninoId === row.nino.id && row.sabados.some(s => s.id === r.sabadoId)
          ? { ...r, pago: true }
          : r
      ))
    } catch (err) {
      console.error('Failed to settle debt:', err)
    } finally {
      setSettling(null)
    }
  }

  if (loading) return <PageFade>{[0, 1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse mb-2" />)}</PageFade>

  return (
    <PageFade>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Deudas</h2>
            <p className="text-sm text-slate-500">Solo janijim activos</p>
          </div>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="h-8 rounded-lg border bg-white px-2 text-sm">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {rows.length === 0 && <div className="rounded-xl border bg-white p-4 text-sm text-slate-500">No hay deudas para {year}.</div>}
        {rows.map((row, i) => (
          <div key={row.nino.id} className="rounded-xl border bg-white p-4 transition-colors duration-100 hover:bg-slate-50 animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900">{row.nino.nombre} {row.nino.apellido}</p>
                <p className="text-xs text-slate-500 truncate">{row.sabados.map(s => new Date(`${s.fecha}T00:00:00`).toLocaleDateString('es-UY')).join(', ')}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <p className="text-lg font-bold text-slate-900">${row.deuda}</p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={settling === row.nino.id}
                  onClick={() => handleLiquidar(row)}
                  className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                >
                  {settling === row.nino.id ? 'Saldando...' : 'Liquidar'}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageFade>
  )
}
