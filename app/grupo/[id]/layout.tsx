'use client'

import { use } from 'react'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { AdminBottomNav } from '@/components/layout/AdminBottomNav'

interface AdminLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default function AdminLayout({ children, params }: AdminLayoutProps) {
  const { id } = use(params)

  return (
    <AuthGuard requiredRole="admin" grupoId={id}>
      <AdminBottomNav grupoId={id} />
      <main className="pt-14 pb-16 min-h-screen bg-slate-50">
        <div className="p-4">
          {children}
        </div>
      </main>
    </AuthGuard>
  )
}
