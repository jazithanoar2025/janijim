'use client'
import { use } from 'react'
export default function AlertasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <div><h2 className="text-xl font-bold text-slate-900 mb-4">Alertas</h2><p className="text-slate-500">Grupo: {id}</p></div>
}
