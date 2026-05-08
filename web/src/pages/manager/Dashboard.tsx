import { useQuery } from '@tanstack/react-query'
import { Users, Clock, Calendar, CheckCircle, Target, Trophy } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { StatsCard } from '@/components/ui/StatsCard'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Attendance } from '@/types/database'

export function ManagerDashboard() {
  const { profile } = useAuth()

  const { data: teamMembers } = useQuery({
    queryKey: ['manager-team', profile?.id, profile?.company_id],
    queryFn: async () => {
      if (!profile?.id) return []

      // Strategy: get employees who either have this manager assigned,
      // OR are in the same company (excluding self and other managers/hr)
      let query = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, positions(name), manager_id, company_id, role')
        .neq('id', profile.id) // exclude self
        .eq('status', 'active')

      if (profile.company_id) {
        // Get all employees in the same company
        query = query.eq('company_id', profile.company_id)
      } else {
        // Fallback: only direct reports
        query = query.eq('manager_id', profile.id)
      }

      const { data } = await query.order('full_name')
      return (data || []) as any[]
    },
    enabled: !!profile?.id,
  })

  const { data: todayAttendance } = useQuery({
    queryKey: ['manager-today-attendance', profile?.id],
    queryFn: async () => {
      if (!profile?.id || !teamMembers?.length) return []
      const today = new Date().toISOString().slice(0, 10)
      const ids = teamMembers.map(m => m.id)
      const { data } = await supabase.from('attendances').select('*, profiles(full_name)').in('user_id', ids).eq('date', today)
      return data as Attendance[]
    },
    enabled: !!profile?.id && !!teamMembers?.length,
  })

  const { data: pendingApprovals } = useQuery({
    queryKey: ['manager-pending-approvals', profile?.id],
    queryFn: async () => {
      if (!profile?.id || !teamMembers?.length) return { leaves: 0, overtime: 0, reimbursement: 0 }
      const ids = teamMembers.map(m => m.id)
      
      const [leaves, ot, reimb] = await Promise.all([
        supabase.from('leave_requests').select('id', { count: 'exact' }).in('user_id', ids).eq('status', 'pending_manager'),
        supabase.from('overtimes').select('id', { count: 'exact' }).in('user_id', ids).eq('status', 'pending_manager'),
        supabase.from('reimbursements').select('id', { count: 'exact' }).in('user_id', ids).eq('status', 'pending'), // if manager approves reimb
      ])

      return {
        leaves: leaves.count || 0,
        overtime: ot.count || 0,
        reimbursement: reimb.count || 0,
      }
    },
    enabled: !!profile?.id && !!teamMembers?.length,
  })

  const totalTeam = teamMembers?.length || 0
  const presentToday = todayAttendance?.filter(a => a.status === 'present').length || 0
  const lateToday = todayAttendance?.filter(a => a.status === 'late').length || 0


  return (
    <AppShell>
      <PageHeader
        title="Dashboard Manager"
        description="Pantau produktivitas dan kehadiran tim Anda hari ini"
        icon={Target}
        breadcrumbs={[{ label: 'Manager Portal' }, { label: 'Dashboard' }]}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
        <StatsCard title="Anggota Tim" value={totalTeam} icon={Users} color="indigo" description="Bawahan langsung" />
        <StatsCard title="Hadir Hari Ini" value={presentToday} icon={CheckCircle} color="emerald" description="Tepat waktu" />
        <StatsCard title="Terlambat" value={lateToday} icon={Clock} color="amber" description="Hari ini" />
        <StatsCard title="Pending Approvals" value={(pendingApprovals?.leaves || 0) + (pendingApprovals?.overtime || 0)} icon={Calendar} color="rose" description="Perlu persetujuan Anda" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Team List */}
        <Card className="card-premium lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-800">Anggota Tim & Status Hari Ini</CardTitle>
                <CardDescription>Status kehadiran real-time</CardDescription>
              </div>
              <Trophy className="h-5 w-5 text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            {teamMembers && teamMembers.length > 0 ? (
              <div className="space-y-4">
                {teamMembers.map(member => {
                  const att = todayAttendance?.find(a => a.user_id === member.id)
                  return (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10 shadow-sm bg-white">
                            <AvatarImage src={member.avatar_url} alt={member.full_name} className="object-cover" />
                            <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-violet-200 text-indigo-700 font-bold">
                              {member.full_name[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                            att?.status === 'present' ? 'bg-emerald-500' : 
                            att?.status === 'late' ? 'bg-amber-500' : 'bg-slate-300'
                          }`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{member.full_name}</p>
                          <p className="text-xs text-slate-500">{member.positions?.name || 'Anggota'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {att ? (
                          <>
                            <span className="block font-mono text-sm font-medium text-slate-700">{new Date(att.clock_in_time!).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                            <StatusBadge status={att.status} />
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-md">Belum Absen</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Users className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500">Anda belum memiliki anggota tim di bawah Anda.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Items */}
        <Card className="card-premium">
          <CardHeader className="pb-4 bg-indigo-50/50 rounded-t-2xl border-b border-indigo-100/50">
            <CardTitle className="text-base font-semibold text-indigo-900">Perlu Tindakan Anda</CardTitle>
            <CardDescription className="text-indigo-600/70">Daftar tunggu approval</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Pengajuan Cuti</p>
                    <p className="text-xs text-slate-500">Dari anggota tim</p>
                  </div>
                </div>
                <div className="h-6 min-w-[24px] px-1.5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold">
                  {pendingApprovals?.leaves || 0}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:bg-violet-100 transition-colors">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Kerja Lembur</p>
                    <p className="text-xs text-slate-500">Menunggu persetujuan</p>
                  </div>
                </div>
                <div className="h-6 min-w-[24px] px-1.5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold">
                  {pendingApprovals?.overtime || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
