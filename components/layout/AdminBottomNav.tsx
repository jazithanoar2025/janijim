'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Home, BarChart2, Users, DollarSign, Bell, LogOut } from 'lucide-react'

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
    { href: `/grupo/${grupoId}/dashboard`, label: 'Dashboard', icon: BarChart2 },
    { href: `/grupo/${grupoId}/janijim`, label: 'Janijim', icon: Users },
    { href: `/grupo/${grupoId}/deudas`, label: 'Deudas', icon: DollarSign },
    {
      href: `/grupo/${grupoId}/alertas`,
      label: 'Alertas',
      icon: Bell,
      badge: alertCount > 0 ? alertCount : undefined,
    },
  ]

  const isActive = (href: string) => {
    if (href === `/grupo/${grupoId}`) return pathname === href
    if (href === `/grupo/${grupoId}/janijim`) return pathname === href || pathname === `/grupo/${grupoId}/gestion`
    return pathname.startsWith(href)
  }

  return (
    <>
      <header
        className="fixed left-0 right-0 top-0 z-10 flex items-center justify-between bg-slate-900 px-4 pb-3 pt-3 text-white"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
      >
        <div>
          <h1 className="font-bold text-sm">{grupoNombre || 'Mi Grupo'}</h1>
          <p className="text-xs text-slate-400">{usuario?.nombre}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={logout} className="text-slate-400 transition-colors duration-150">
          <LogOut size={16} />
        </Button>
      </header>

      <nav
        className="fixed left-4 right-4 z-20 flex h-14 rounded-2xl border bg-white shadow-lg touch-manipulation"
        style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        {navItems.map(({ href, label, icon: Icon, badge }) => (
          <Link
            key={href}
            href={href}
            className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] transition-colors duration-100 [-webkit-tap-highlight-color:transparent] ${
              isActive(href) ? 'text-slate-900' : 'text-slate-400'
            }`}
          >
            {isActive(href) && (
              <span className="absolute top-1.5 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-slate-900" />
            )}
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
