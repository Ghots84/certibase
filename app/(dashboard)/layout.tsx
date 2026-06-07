import Sidebar from '@/components/sidebar'
import Topbar from '@/components/topbar'
import ToastProvider from '@/components/toast-provider'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex" style={{ height: '100vh', minWidth: 1080, background: 'var(--bg)' }}>
      <Sidebar />
      <main className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
          {children}
        </div>
      </main>
      <ToastProvider />
    </div>
  )
}
