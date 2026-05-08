import { useQuery } from '@tanstack/react-query'
import { Wallet, Clock, Calendar, CheckSquare, Megaphone, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { StatsCard } from '@/components/ui/StatsCard'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency } from '@/lib/payroll-calculator'
import type { Attendance, Announcement } from '@/types/database'

export function EmployeeDashboard() {
  const { profile } = useAuth()

  // General Stats
  const { data: stats } = useQuery({
    queryKey: ['employee-stats', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return { pendingLeaves: 0, pendingOvertime: 0 }
      const [leaves, ot] = await Promise.all([
        supabase.from('leave_requests').select('id', { count: 'exact' }).eq('user_id', profile.id).in('status', ['pending_manager', 'pending_hr']),
        supabase.from('overtimes').select('id', { count: 'exact' }).eq('user_id', profile.id).in('status', ['pending_manager', 'pending_hr']),
      ])
      return { pendingLeaves: leaves.count || 0, pendingOvertime: ot.count || 0 }
    },
    enabled: !!profile?.id,
  })

  // Today Attendance
  const { data: todayAttendance } = useQuery({
    queryKey: ['employee-today-attendance', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null
      const today = new Date().toISOString().slice(0, 10)
      const { data } = await supabase.from('attendances').select('*').eq('user_id', profile.id).eq('date', today).maybeSingle()
      return data as Attendance | null
    },
    enabled: !!profile?.id,
  })

  // Latest Payslip
  const { data: latestPayslip } = useQuery({
    queryKey: ['employee-latest-payslip', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null
      const { data } = await supabase.from('payslips').select('*').eq('user_id', profile.id).eq('status', 'published').order('year', { ascending: false }).order('month', { ascending: false }).limit(1).maybeSingle()
      return data
    },
    enabled: !!profile?.id,
  })

  // Active Announcements
  const { data: announcements } = useQuery({
    queryKey: ['active-announcements'],
    queryFn: async () => {
      const { data } = await supabase.from('announcements').select('*, profiles(full_name)').eq('is_active', true).order('created_at', { ascending: false }).limit(3)
      return data as (Announcement & { profiles: { full_name: string } })[]
    },
  })

  return (
    <AppShell>
      <PageHeader
        title={`Halo, ${profile?.full_name?.split(' ')[0] || 'Karyawan'}!`}
        description="Selamat datang di Portal Karyawan (Self Service)"
        icon={CheckSquare}
        breadcrumbs={[{ label: 'Employee Space' }, { label: 'Dashboard' }]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stagger">
        <StatsCard 
          title="Kehadiran Hari Ini" 
          value={todayAttendance?.clock_in_time ? new Date(todayAttendance.clock_in_time).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' }) : 'Belum'} 
          icon={Clock} 
          color={todayAttendance ? 'emerald' : 'amber'} 
          description={todayAttendance ? "Berhasil absen" : "Jangan lupa absen"} 
        />
        <StatsCard title="Cuti Menunggu" value={stats?.pendingLeaves || 0} icon={Calendar} color="indigo" />
        <StatsCard title="Lembur Menunggu" value={stats?.pendingOvertime || 0} icon={Clock} color="violet" />
        <StatsCard 
          title="Gaji Terakhir" 
          value={latestPayslip ? formatCurrency(latestPayslip.net_salary) : '—'} 
          icon={Wallet} 
          color="emerald" 
          description={latestPayslip ? `Periode ${latestPayslip.month}/${latestPayslip.year}` : 'Belum ada data'} 
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Access */}
          <Card className="card-premium bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-0 shadow-lg shadow-indigo-200">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-4">Butuh Pelayanan Cepat?</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Link to="/employee/attendance" className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/10 group">
                  <MapPin className="h-6 w-6 mb-2 text-indigo-100 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium">Absen Web</span>
                </Link>
                <Link to="/employee/leave" className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/10 group">
                  <Calendar className="h-6 w-6 mb-2 text-indigo-100 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium">Buat Cuti</span>
                </Link>
                <Link to="/employee/overtime" className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/10 group">
                  <Clock className="h-6 w-6 mb-2 text-indigo-100 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium">Lembur</span>
                </Link>
                <Link to="/employee/payslips" className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/10 group">
                  <Wallet className="h-6 w-6 mb-2 text-indigo-100 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium">Slip Gaji</span>
                </Link>
              </div>
            </CardContent>
          </Card>
          
          {/* Announcements */}
          <Card className="card-premium">
            <CardHeader className="pb-3 border-b border-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 text-rose-500 rounded-lg"><Megaphone className="h-5 w-5" /></div>
                <div><CardTitle className="text-base font-semibold">Pengumuman Terbaru</CardTitle></div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {announcements && announcements.length > 0 ? (
                <div className="space-y-4">
                  {announcements.map(ann => (
                    <div key={ann.id} className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-slate-800">{ann.title}</h4>
                        <span className="text-xs text-slate-400 whitespace-nowrap ml-4">{new Date(ann.created_at).toLocaleDateString('id-ID')}</span>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2">{ann.content}</p>
                      <p className="text-xs text-indigo-600 mt-2 font-medium">Oleh: {ann.profiles?.full_name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">Belum ada pengumuman.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Profile Summary */}
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-center">Profil Saya</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 shadow-md mb-4 bg-white p-1 border-4 border-white">
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'Profile'} className="object-cover rounded-full" />
              <AvatarFallback className="bg-gradient-to-br from-indigo-200 to-violet-300 text-white text-3xl font-bold rounded-full">
                {profile?.full_name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-lg font-bold text-slate-800">{profile?.full_name}</h3>
            <p className="text-sm text-indigo-600 font-medium mb-1">{(profile as any)?.positions?.name || 'Karyawan'}</p>
            <p className="text-xs text-slate-500 mb-6">{(profile as any)?.departments?.name || 'HRIS System'}</p>
            
            <div className="w-full space-y-3">
              <div className="flex justify-between text-sm py-2 border-b border-slate-100">
                <span className="text-slate-500">ID Karyawan</span>
                <span className="font-semibold text-slate-700">{profile?.employee_id || '—'}</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-slate-100">
                <span className="text-slate-500">Tanggal Masuk</span>
                <span className="font-semibold text-slate-700">{profile?.hire_date ? new Date(profile.hire_date).toLocaleDateString('id-ID') : '—'}</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-slate-100">
                <span className="text-slate-500">Status</span>
                <StatusBadge status={profile?.status || ''} />
              </div>
            </div>

            <Link to="/employee/profile" className="w-full mt-6">
              <Button variant="outline" className="w-full">Lihat Detail Profil</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
