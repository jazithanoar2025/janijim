'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  LogOut,
  UsersRound,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/grupos', label: 'Grupos', icon: UsersRound },
  { href: '/dashboard/janijim', label: 'Janijim', icon: Users },
  { href: '/dashboard/stats', label: 'Estadísticas', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function SuperadminSidebar() {
  const pathname = usePathname()
  const { logout, usuario } = useAuth()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 min-h-screen bg-slate-900 text-white p-4 fixed left-0 top-0">
        <div className="mb-8">
          <h1 className="font-bold text-lg">Jazit Hanoar</h1>
          <p className="text-xs text-slate-400">{usuario?.nombre}</p>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                pathname === href
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="justify-start text-slate-400 hover:text-white gap-2"
        >
          <LogOut size={16} />
          Salir
        </Button>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 text-white fixed top-0 left-0 right-0 z-10">
        <h1 className="font-bold">Jazit Hanoar</h1>
        <Button variant="ghost" size="sm" onClick={logout} className="text-slate-400">
          <LogOut size={16} />
        </Button>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex z-10">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center py-2 text-xs gap-1 transition-colors ${
              pathname === href ? 'text-slate-900' : 'text-slate-400'
            }`}
          >
            <Icon size={20} />
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
