import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Building2, Briefcase, Clock,
  DollarSign, CreditCard, ClipboardList, BarChart3, Bell,
  Settings, ChevronLeft, ChevronRight, UserCircle,
  Calendar, Receipt, FileSignature, Landmark, BookOpen,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

interface NavItem {
  label: string
  icon: React.ElementType
  href: string
  badge?: number
  group?: string
}

const hrNavItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/hr', group: 'Utama' },
  { label: 'Perusahaan', icon: Building2, href: '/hr/companies', group: 'Utama' },
  { label: 'Karyawan', icon: Users, href: '/hr/employees', group: 'Karyawan' },
  { label: 'Departemen', icon: Briefcase, href: '/hr/departments', group: 'Karyawan' },
  { label: 'Kontrak', icon: FileSignature, href: '/hr/contracts', group: 'Karyawan' },
  { label: 'Kehadiran', icon: Clock, href: '/hr/attendance', group: 'Aktivitas' },
  { label: 'Pengajuan Cuti', icon: Calendar, href: '/hr/leaves', group: 'Aktivitas' },
  { label: 'Lembur', icon: ClipboardList, href: '/hr/overtime', group: 'Aktivitas' },
  { label: 'Reimbursement', icon: Receipt, href: '/hr/reimbursement', group: 'Keuangan' },
  { label: 'Payroll & BPJS', icon: DollarSign, href: '/hr/payroll', group: 'Keuangan' },
  { label: 'Pinjaman', icon: Landmark, href: '/hr/loans', group: 'Keuangan' },
  { label: 'Pengumuman', icon: Bell, href: '/hr/announcements', group: 'Komunikasi' },
  { label: 'Audit Log', icon: BookOpen, href: '/hr/audit-log', group: 'Sistem' },
]

const managerNavItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/manager', group: 'Utama' },
  { label: 'Kehadiran Tim', icon: Clock, href: '/manager/team-attendance', group: 'Tim' },
  { label: 'Persetujuan', icon: ClipboardList, href: '/manager/approvals', group: 'Tim' },
]

const employeeNavItems: NavItem[] = [
  { label: 'Beranda', icon: LayoutDashboard, href: '/employee' },
  { label: 'Kehadiran', icon: Clock, href: '/employee/attendance' },
  { label: 'Pengajuan Cuti', icon: Calendar, href: '/employee/leave' },
  { label: 'Lembur', icon: ClipboardList, href: '/employee/overtime' },
  { label: 'Reimbursement', icon: Receipt, href: '/employee/reimbursement' },
  { label: 'Slip Gaji', icon: DollarSign, href: '/employee/payslips' },
  { label: 'Pinjaman', icon: CreditCard, href: '/employee/loans' },
  { label: 'Profil Saya', icon: UserCircle, href: '/employee/profile' },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation()
  const { profile } = useAuth()

  const navItems = profile?.role === 'hr' ? hrNavItems
    : profile?.role === 'manager' ? managerNavItems
    : employeeNavItems

  const grouped = navItems.reduce((acc, item) => {
    const group = item.group || 'Menu'
    if (!acc[group]) acc[group] = []
    acc[group].push(item)
    return acc
  }, {} as Record<string, NavItem[]>)

  const isActive = (href: string) => {
    if (href === '/hr' || href === '/manager' || href === '/employee') {
      return location.pathname === href
    }
    return location.pathname.startsWith(href)
  }

  return (
    <aside
      className="fixed left-0 top-0 h-full z-30 flex flex-col bg-white border-r border-slate-100 transition-all duration-300 ease-in-out shadow-sm"
      style={{ width: collapsed ? 72 : 268 }}
    >
      {/* Logo */}
      <div className={`h-16 flex items-center border-b border-slate-100 px-4 gap-3 shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shrink-0">
            <BarChart3 className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="font-bold text-slate-900 text-sm leading-tight">HRIS System</p>
              <p className="text-[10px] text-slate-400 capitalize">{profile?.role} Portal</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors p-0"
          >
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar space-y-6">
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group}>
            {!collapsed && (
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-2">
                {group}
              </p>
            )}
            <div className="space-y-0.5">
              {items.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link key={item.label} to={item.href} title={collapsed ? item.label : undefined}>
                    <div className={`nav-item ${active ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}>
                      <item.icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {!collapsed && item.badge && (
                        <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-slate-100 p-3 shrink-0">
        {collapsed ? (
          <Button variant="ghost" onClick={onToggle} className="w-full h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors px-0">
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </Button>
        ) : (
          <Link to="/employee/profile">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {profile?.full_name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">{profile?.full_name}</p>
                <p className="text-[11px] text-slate-400 capitalize">{profile?.role}</p>
              </div>
              <Settings className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
            </div>
          </Link>
        )}
      </div>
    </aside>
  )
}
