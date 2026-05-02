import { AuthGuard } from '@/components/auth/AuthGuard'
import { SuperadminSidebar } from '@/components/layout/SuperadminSidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRole="superadmin">
      <SuperadminSidebar />
      <main className="md:ml-56 pt-14 md:pt-0 pb-16 md:pb-0 min-h-screen bg-slate-50">
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </AuthGuard>
  )
}
