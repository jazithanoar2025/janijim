'use client'

import { use, useEffect, useState } from 'react'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { AdminBottomNav } from '@/components/layout/AdminBottomNav'
import { getSabadosByGrupo, getJanijimByGrupo, getAsistenciaByGrupo } from '@/lib/firestore'
import { computeAlerts } from '@/lib/alerts'

interface AdminLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default function AdminLayout({ children, params }: AdminLayoutProps) {
  const { id } = use(params)
  const [alertCount, setAlertCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    setAlertCount(0)
    Promise.all([
      getSabadosByGrupo(id),
      getJanijimByGrupo(id),
      getAsistenciaByGrupo(id),
    ]).then(([sabados, janijim, asistencia]) => {
      if (!cancelled) {
        setAlertCount(computeAlerts(sabados, janijim, asistencia).length)
      }
    }).catch(err => {
      console.error('Failed to load alert data:', err)
    })
    return () => { cancelled = true }
  }, [id])

  return (
    <AuthGuard requiredRole="admin" grupoId={id}>
      <AdminBottomNav grupoId={id} alertCount={alertCount} />
      <main className="pt-14 pb-16 min-h-screen bg-slate-50">
        <div className="p-4">
          {children}
        </div>
      </main>
    </AuthGuard>
  )
}
