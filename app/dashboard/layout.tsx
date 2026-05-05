import { AuthGuard } from '@/components/auth/AuthGuard'
import { SuperadminSidebar } from '@/components/layout/SuperadminSidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRole="superadmin">
      <SuperadminSidebar />
      <main className="md:ml-56 min-h-screen bg-slate-50">
        <div className="p-3 md:p-6" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
          <div className="md:hidden" style={{ height: 'calc(4rem + env(safe-area-inset-top))' }} />
          {children}
        </div>
      </main>
    </AuthGuard>
  )
}
