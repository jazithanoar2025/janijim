'use client'

import { use } from 'react'

interface Props {
  params: Promise<{ id: string }>
}

export default function GrupoPage({ params }: Props) {
  const { id } = use(params)

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 mb-4">Mi Grupo</h2>
      <p className="text-slate-500">Grupo ID: {id}</p>
    </div>
  )
}
