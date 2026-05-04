'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Home, Users, Bell, LogOut } from 'lucide-react'

interface AdminBottomNavProps {
  grupoId: string
  grupoNombre?: string
  alertCount?: number
}

export function AdminBottomNav({ grupoId, grupoNombre, alertCount = 0 }: AdminBottomNavProps) {
  const pathname = usePathname()
  const { logout, usuario } = useAuth()

  const navItems = [
    { href: `/grupo/${grupoId}`, label: 'Inicio', icon: Home },
    { href: `/grupo/${grupoId}/janijim`, label: 'Janijim', icon: Users },
    {
      href: `/grupo/${grupoId}/alertas`,
      label: 'Alertas',
      icon: Bell,
      badge: alertCount > 0 ? alertCount : undefined,
    },
  ]

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white fixed top-0 left-0 right-0 z-10">
        <div>
          <h1 className="font-bold text-sm">{grupoNombre || 'Mi Grupo'}</h1>
          <p className="text-xs text-slate-400">{usuario?.nombre}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={logout} className="text-slate-400 transition-colors duration-150">
          <LogOut size={16} />
        </Button>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex z-10">
        {navItems.map(({ href, label, icon: Icon, badge }) => (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center py-2 text-xs gap-1 relative transition-colors duration-150 ${
              pathname === href ? 'text-slate-900' : 'text-slate-400'
            }`}
          >
            <span className="relative">
              <Icon size={20} />
              {badge !== undefined && (
                <Badge className="absolute -top-1 -right-2 h-4 min-w-4 px-1 text-xs bg-red-500">
                  {badge}
                </Badge>
              )}
            </span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
