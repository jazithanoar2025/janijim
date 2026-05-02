'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/lib/types'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole: UserRole
  grupoId?: string
}

export function AuthGuard({ children, requiredRole, grupoId }: AuthGuardProps) {
  const { usuario, loading } = useAuth()
  const router = useRouter()
  const isWrongGroup =
    requiredRole === 'admin' &&
    Boolean(grupoId) &&
    usuario?.rol === 'admin' &&
    usuario.grupoId !== grupoId

  useEffect(() => {
    if (loading) return

    if (!usuario) {
      router.replace('/login')
      return
    }

    if (usuario.rol !== requiredRole) {
      if (usuario.rol === 'superadmin') {
        router.replace('/dashboard')
      } else if (usuario.grupoId) {
        router.replace(`/grupo/${usuario.grupoId}`)
      } else {
        router.replace('/login')
      }
      return
    }

    if (isWrongGroup && usuario.grupoId) {
      router.replace(`/grupo/${usuario.grupoId}`)
    }
  }, [usuario, loading, requiredRole, isWrongGroup, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400 text-sm">Cargando...</div>
      </div>
    )
  }

  if (!usuario || usuario.rol !== requiredRole || isWrongGroup) return null

  return <>{children}</>
}
