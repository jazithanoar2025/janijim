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
  Calendar,
  DollarSign,
  UserCog,
  Bell,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/kvutzot', label: 'Kvutzot', icon: UsersRound },
  { href: '/dashboard/janijim', label: 'Janijim', icon: Users },
  { href: '/dashboard/sabados', label: 'Sábados', icon: Calendar },
  { href: '/dashboard/deudores', label: 'Deudores', icon: DollarSign },
  { href: '/dashboard/alertas', label: 'Alertas', icon: Bell },
  { href: '/dashboard/stats', label: 'Estadísticas', icon: BarChart3 },
  { href: '/dashboard/usuarios', label: 'Responsables', icon: UserCog },
  { href: '/dashboard/settings', label: 'Ajustes', icon: Settings },
]

export function SuperadminSidebar() {
  const pathname = usePathname()
  const { logout, usuario } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <>
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
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-150 ${
                isActive(href)
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
          className="justify-start text-slate-400 hover:text-white gap-2 transition-colors duration-150"
        >
          <LogOut size={16} />
          Salir
        </Button>
      </aside>

      <header
        className="md:hidden flex items-center justify-between px-4 bg-slate-900 text-white fixed top-0 left-0 right-0 z-20"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))', paddingBottom: '0.75rem' }}
      >
        <div>
          <h1 className="font-bold">Jazit Hanoar</h1>
          <p className="text-xs text-slate-400">{usuario?.nombre}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setMenuOpen(v => !v)} className="text-slate-200 transition-colors duration-150">
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </Button>
      </header>

      {menuOpen && (
        <div className="md:hidden fixed inset-x-3 z-20 rounded-2xl border bg-white p-3 shadow-xl overflow-y-auto max-h-[70svh]" style={{ top: 'calc(4rem + env(safe-area-inset-top))' }}>
          <nav className="grid grid-cols-2 gap-2">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 rounded-xl px-3 py-3 text-sm transition-colors duration-150 ${
                  isActive(href) ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon size={17} />
                <span>{label}</span>
              </Link>
            ))}
            <button onClick={logout} className="flex items-center gap-2 rounded-xl px-3 py-3 text-left text-sm text-slate-600 hover:bg-slate-50">
              <LogOut size={17} /> Salir
            </button>
          </nav>
        </div>
      )}
    </>
  )
}
