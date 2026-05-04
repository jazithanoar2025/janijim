import { AuthGuard } from '@/components/auth/AuthGuard'
import { SuperadminSidebar } from '@/components/layout/SuperadminSidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRole="superadmin">
      <SuperadminSidebar />
      <main className="md:ml-56 pt-16 md:pt-0 pb-6 min-h-screen bg-slate-50">
        <div className="p-3 md:p-6">
          {children}
        </div>
      </main>
    </AuthGuard>
  )
}
