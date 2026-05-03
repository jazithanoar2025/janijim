'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { AdminBottomNav } from '@/components/layout/AdminBottomNav'
import { getAllSabados, getNinosByGrupo, getRegistrosByNinos, getAppConfig } from '@/lib/firestore'
import { computeAlerts } from '@/lib/alerts'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { id } = useParams<{ id: string }>()
  const [alertCount, setAlertCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([getAllSabados(), getNinosByGrupo(id), getAppConfig()])
      .then(async ([sabados, ninos, config]) => {
      const registros = await getRegistrosByNinos(ninos.map(n => n.id))
      if (!cancelled) {
        setAlertCount(computeAlerts(sabados, ninos, registros, config.umbralFidelidadAlerta, config.añoActivo).length)
      }
    }).catch(err => console.error('Failed to load alert data:', err))
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
