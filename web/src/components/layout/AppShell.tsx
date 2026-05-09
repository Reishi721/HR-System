import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileBottomNav } from './MobileBottomNav'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false)

  // Global realtime sync + push notifications
  useRealtimeSync()

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const sidebarWidth = collapsed ? 72 : 268

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop only: Sidebar */}
      {!isMobile && (
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(v => !v)}
        />
      )}

      {/* Main content area */}
      <div
        className="transition-all duration-300 ease-in-out flex flex-col min-h-screen"
        style={{ paddingLeft: isMobile ? 0 : sidebarWidth }}
      >
        <Topbar />
        <main className={`flex-1 p-4 md:p-6 lg:p-8 page-enter ${isMobile ? 'pb-24' : ''}`}>
          {children}
        </main>
      </div>

      {/* Mobile only: Bottom Navigation */}
      {isMobile && <MobileBottomNav />}
    </div>
  )
}
