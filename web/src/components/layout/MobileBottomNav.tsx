import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Clock, Calendar, DollarSign, UserCircle,
  Users, ClipboardList, MoreHorizontal, Receipt, CreditCard,
  X, Landmark, Building2, Briefcase, FileSignature, Bell,
  BookOpen,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface NavItem {
  label: string
  icon: React.ElementType
  href: string
  isCenter?: boolean
  isMore?: boolean
}

// Bottom bar items (max 5)
const employeeBottomNav: NavItem[] = [
  { label: 'Beranda', icon: LayoutDashboard, href: '/employee' },
  { label: 'Kehadiran', icon: Clock, href: '/employee/attendance' },
  { label: 'Cuti', icon: Calendar, href: '/employee/leave', isCenter: true },
  { label: 'Slip Gaji', icon: DollarSign, href: '/employee/payslips' },
  { label: 'Lainnya', icon: MoreHorizontal, href: '', isMore: true },
]

const hrBottomNav: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/hr' },
  { label: 'Karyawan', icon: Users, href: '/hr/employees' },
  { label: 'Cuti', icon: Calendar, href: '/hr/leaves', isCenter: true },
  { label: 'Payroll', icon: DollarSign, href: '/hr/payroll' },
  { label: 'Lainnya', icon: MoreHorizontal, href: '', isMore: true },
]

const managerBottomNav: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/manager' },
  { label: 'Tim', icon: Clock, href: '/manager/team-attendance' },
  { label: 'Approval', icon: ClipboardList, href: '/manager/approvals', isCenter: true },
  { label: 'Lainnya', icon: MoreHorizontal, href: '', isMore: true },
]

// Full menu for bottom sheet
interface MenuItem {
  label: string
  icon: React.ElementType
  href: string
  group: string
}

const employeeFullMenu: MenuItem[] = [
  { label: 'Beranda', icon: LayoutDashboard, href: '/employee', group: 'Menu' },
  { label: 'Kehadiran', icon: Clock, href: '/employee/attendance', group: 'Menu' },
  { label: 'Pengajuan Cuti', icon: Calendar, href: '/employee/leave', group: 'Menu' },
  { label: 'Lembur', icon: ClipboardList, href: '/employee/overtime', group: 'Aktivitas' },
  { label: 'Reimbursement', icon: Receipt, href: '/employee/reimbursement', group: 'Aktivitas' },
  { label: 'Slip Gaji', icon: DollarSign, href: '/employee/payslips', group: 'Keuangan' },
  { label: 'Pinjaman', icon: CreditCard, href: '/employee/loans', group: 'Keuangan' },
  { label: 'Profil Saya', icon: UserCircle, href: '/employee/profile', group: 'Akun' },
]

const hrFullMenu: MenuItem[] = [
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

const managerFullMenu: MenuItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/manager', group: 'Utama' },
  { label: 'Kehadiran Tim', icon: Clock, href: '/manager/team-attendance', group: 'Tim' },
  { label: 'Persetujuan', icon: ClipboardList, href: '/manager/approvals', group: 'Tim' },
]

export function MobileBottomNav() {
  const location = useLocation()
  const { profile } = useAuth()
  const [sheetOpen, setSheetOpen] = useState(false)

  const navItems = profile?.role === 'hr' ? hrBottomNav
    : profile?.role === 'manager' ? managerBottomNav
    : employeeBottomNav

  const fullMenu = profile?.role === 'hr' ? hrFullMenu
    : profile?.role === 'manager' ? managerFullMenu
    : employeeFullMenu

  const groupedMenu = fullMenu.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {} as Record<string, MenuItem[]>)

  const isActive = (href: string) => {
    if (!href) return false
    if (href === '/hr' || href === '/manager' || href === '/employee') {
      return location.pathname === href
    }
    return location.pathname.startsWith(href)
  }

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40">
        <div className="bg-white/90 backdrop-blur-xl border-t border-slate-200/60 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div
            className="flex items-end justify-around px-1"
            style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
          >
            {navItems.map((item) => {
              const active = isActive(item.href)

              // Center floating action button
              if (item.isCenter) {
                return (
                  <Link key={item.label} to={item.href} className="flex flex-col items-center -mt-4 relative px-2">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 bg-gradient-to-br from-indigo-500 to-violet-600 hover:shadow-xl ${active ? 'shadow-indigo-400/40 shadow-xl ring-4 ring-indigo-100' : ''}`}>
                      <item.icon className="h-5 w-5 text-white" />
                    </div>
                    <span className={`text-[10px] font-semibold mt-1 ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {item.label}
                    </span>
                  </Link>
                )
              }

              // "Lainnya" button → opens bottom sheet
              if (item.isMore) {
                return (
                  <button
                    key={item.label}
                    onClick={() => setSheetOpen(true)}
                    className="flex flex-col items-center justify-center py-2 px-2 min-w-[52px] group"
                  >
                    <div className="h-6 w-6 flex items-center justify-center">
                      <item.icon className={`h-5 w-5 transition-colors ${sheetOpen ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    </div>
                    <span className={`text-[10px] font-medium mt-1 transition-colors ${sheetOpen ? 'text-indigo-600 font-semibold' : 'text-slate-400 group-hover:text-slate-600'}`}>
                      {item.label}
                    </span>
                  </button>
                )
              }

              // Regular nav item
              return (
                <Link key={item.label} to={item.href} className="flex flex-col items-center justify-center py-2 px-2 min-w-[52px] group">
                  <div className="h-6 w-6 flex items-center justify-center">
                    <item.icon className={`h-5 w-5 transition-colors ${active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  </div>
                  <span className={`text-[10px] font-medium mt-1 transition-colors ${active ? 'text-indigo-600 font-semibold' : 'text-slate-400 group-hover:text-slate-600'}`}>
                    {item.label}
                  </span>
                  {active && <div className="h-1 w-1 rounded-full bg-indigo-600 mt-0.5" />}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Bottom Sheet - All Menu Items */}
      {sheetOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={() => setSheetOpen(false)}
          />

          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
            <div className="bg-white rounded-t-3xl shadow-2xl max-h-[70vh] flex flex-col">
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-slate-200" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-base">Semua Menu</h3>
                <button
                  onClick={() => setSheetOpen(false)}
                  className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
                >
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              {/* Menu Grid */}
              <div className="overflow-y-auto px-5 py-4 space-y-5" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
                {Object.entries(groupedMenu).map(([group, items]) => (
                  <div key={group}>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">{group}</p>
                    <div className="grid grid-cols-4 gap-3">
                      {items.map((item) => {
                        const active = isActive(item.href)
                        return (
                          <Link
                            key={item.label}
                            to={item.href}
                            onClick={() => setSheetOpen(false)}
                            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all hover:bg-slate-50 active:scale-95"
                          >
                            <div className={`h-11 w-11 rounded-xl flex items-center justify-center transition-colors ${active ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                              <item.icon className={`h-5 w-5 ${active ? 'text-indigo-600' : 'text-slate-500'}`} />
                            </div>
                            <span className={`text-[11px] font-medium text-center leading-tight ${active ? 'text-indigo-600 font-semibold' : 'text-slate-600'}`}>
                              {item.label}
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
