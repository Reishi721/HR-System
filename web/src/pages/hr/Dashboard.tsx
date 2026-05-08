import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, Clock, Calendar, DollarSign, TrendingUp, AlertCircle, CheckCircle, Building2 } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { AppShell } from '@/components/layout/AppShell'
import { StatsCard } from '@/components/ui/StatsCard'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/payroll-calculator'
import type { LeaveRequest, Profile } from '@/types/database'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export function HRDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['hr-stats'],
    queryFn: async () => {
      const [employees, pendingLeaves, pendingOvertime, payslipsThisMonth] = await Promise.all([
        supabase.from('profiles').select('id, status', { count: 'exact' }).eq('status', 'active'),
        supabase.from('leave_requests').select('id', { count: 'exact' }).in('status', ['pending_manager', 'pending_hr']),
        supabase.from('overtimes').select('id', { count: 'exact' }).in('status', ['pending_manager', 'pending_hr']),
        supabase.from('payslips').select('net_salary').eq('month', new Date().getMonth() + 1).eq('year', new Date().getFullYear()).eq('status', 'published'),
      ])
      const totalPayroll = payslipsThisMonth.data?.reduce((sum, p) => sum + Number(p.net_salary), 0) || 0
      return {
        totalEmployees: employees.count || 0,
        pendingLeaves: pendingLeaves.count || 0,
        pendingOvertime: pendingOvertime.count || 0,
        totalPayroll,
      }
    },
  })

  const { data: attendance7days } = useQuery({
    queryKey: ['attendance-7days'],
    queryFn: async () => {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (6 - i))
        return d.toISOString().slice(0, 10)
      })
      const { data } = await supabase.from('attendances').select('date, status').in('date', days)
      return days.map(day => {
        const dayData = data?.filter(r => r.date === day) || []
        return {
          name: new Date(day).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
          Hadir: dayData.filter(r => r.status === 'present').length,
          Terlambat: dayData.filter(r => r.status === 'late').length,
          Absen: dayData.filter(r => r.status === 'absent').length,
        }
      })
    },
  })

  const { data: deptDistribution } = useQuery({
    queryKey: ['dept-distribution'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('departments(name)').eq('status', 'active').not('department_id', 'is', null)
      const counts: Record<string, number> = {}
      data?.forEach(p => {
        const name = (p as any).departments?.name || 'Tidak ada'
        counts[name] = (counts[name] || 0) + 1
      })
      return Object.entries(counts).map(([name, value]) => ({ name, value }))
    },
  })

  const { data: recentLeaves } = useQuery({
    queryKey: ['recent-leaves'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leave_requests')
        .select('*, profiles!inner(full_name, avatar_url)')
        .in('status', ['pending_manager', 'pending_hr'])
        .order('created_at', { ascending: false })
        .limit(5)
      return data as any[]
    },
  })

  const { data: payrollTrend } = useQuery({
    queryKey: ['payroll-trend'],
    queryFn: async () => {
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date()
        d.setMonth(d.getMonth() - (5 - i))
        return { month: d.getMonth() + 1, year: d.getFullYear(), label: d.toLocaleDateString('id-ID', { month: 'short' }) }
      })
      const results = await Promise.all(months.map(async m => {
        const { data } = await supabase.from('payslips').select('net_salary').eq('month', m.month).eq('year', m.year)
        const total = data?.reduce((s, p) => s + Number(p.net_salary), 0) || 0
        return { name: m.label, total }
      }))
      return results
    },
  })

  return (
    <AppShell>
      <PageHeader
        title="Dashboard HR"
        description="Ringkasan aktivitas dan statistik HR hari ini"
        icon={LayoutDashboard}
        breadcrumbs={[{ label: 'HR Portal' }, { label: 'Dashboard' }]}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
        <StatsCard
          title="Total Karyawan Aktif"
          value={stats?.totalEmployees || 0}
          icon={Users}
          color="indigo"
          loading={statsLoading}
          description="Karyawan terdaftar"
          trend={2.4}
          chartData={[{value:10},{value:15},{value:20},{value:18},{value:25}]}
        />
        <StatsCard
          title="Cuti Menunggu"
          value={stats?.pendingLeaves || 0}
          icon={Calendar}
          color="amber"
          loading={statsLoading}
          description="Perlu persetujuan"
          trend={-5.0}
          chartData={[{value:10},{value:8},{value:12},{value:5},{value:2}]}
        />
        <StatsCard
          title="Lembur Pending"
          value={stats?.pendingOvertime || 0}
          icon={Clock}
          color="violet"
          loading={statsLoading}
          description="Menunggu approval"
        />
        <StatsCard
          title="Total Payroll Bulan Ini"
          value={formatCurrency(stats?.totalPayroll || 0)}
          icon={DollarSign}
          color="emerald"
          loading={statsLoading}
          description="Sudah dipublikasi"
          trend={12.5}
          chartData={payrollTrend?.map(p => ({ value: p.total }))}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Attendance Chart */}
        <div className="lg:col-span-2">
          <Card className="card-premium">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Kehadiran 7 Hari Terakhir</CardTitle>
              <CardDescription>Hadir, terlambat, dan absen harian</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={attendance7days || []} barSize={8} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', fontSize: 12 }} />
                  <Bar dataKey="Hadir" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Terlambat" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Absen" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Dept Distribution */}
        <Card className="card-premium">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Distribusi Departemen</CardTitle>
            <CardDescription>Komposisi karyawan per dept.</CardDescription>
          </CardHeader>
          <CardContent>
            {deptDistribution && deptDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={deptDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                    {deptDistribution.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-slate-600">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center text-slate-400 text-sm">Belum ada data departemen</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 + Recent */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Payroll Trend */}
        <div className="lg:col-span-2">
          <Card className="card-premium">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Tren Payroll 6 Bulan</CardTitle>
              <CardDescription>Total gaji bersih yang dibayarkan</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={payrollTrend || []}>
                  <defs>
                    <linearGradient id="payrollGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1e6).toFixed(0)}jt`} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', fontSize: 12 }} formatter={v => [formatCurrency(Number(v)), 'Total Payroll']} />
                  <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5} fill="url(#payrollGrad)" dot={{ fill: '#6366f1', strokeWidth: 0, r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Pending Leaves */}
        <Card className="card-premium">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Cuti Menunggu Approval</CardTitle>
            <CardDescription>Perlu tindakan segera</CardDescription>
          </CardHeader>
          <CardContent>
            {recentLeaves && recentLeaves.length > 0 ? (
              <div className="space-y-3">
                {recentLeaves.map((req: any) => (
                  <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/50 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-300 to-violet-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {req.profiles?.full_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{req.profiles?.full_name}</p>
                      <p className="text-xs text-slate-400">{req.type} · {req.start_date}</p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center gap-2 text-slate-400">
                <CheckCircle className="h-8 w-8 text-emerald-300" />
                <p className="text-sm">Semua sudah diproses!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

function LayoutDashboard({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}
