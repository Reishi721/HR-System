import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { CheckSquare, Search, Filter } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { DataTable } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/DatePicker'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Attendance } from '@/types/database'

export function TeamAttendance() {
  const { profile } = useAuth()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  const { data: teamMembers } = useQuery({
    queryKey: ['manager-team', profile?.id, profile?.company_id],
    queryFn: async () => {
      if (!profile?.id) return []

      let query = supabase
        .from('profiles')
        .select('id, full_name, employee_id, avatar_url')
        .neq('id', profile.id)
        .eq('status', 'active')

      if (profile.company_id) {
        query = query.eq('company_id', profile.company_id)
      } else {
        query = query.eq('manager_id', profile.id)
      }

      const { data } = await query.order('full_name')
      return (data || []) as any[]
    },
    enabled: !!profile?.id,
  })

  const { data: attendances, isLoading } = useQuery({
    queryKey: ['team-attendance', profile?.id, date],
    queryFn: async () => {
      if (!teamMembers?.length) return []
      const ids = teamMembers.map(m => m.id)
      const { data } = await supabase.from('attendances').select('*').in('user_id', ids).eq('date', date)
      
      // Merge with team members so absent employees also show up
      return teamMembers.map(member => {
        const att = data?.find(a => a.user_id === member.id)
        return {
          ...member,
          attendance: att || { status: 'absent', date }
        }
      })
    },
    enabled: !!teamMembers?.length,
  })

  const columns: ColumnDef<any>[] = [
    {
      id: 'employee',
      header: 'Anggota Tim',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.original.avatar_url} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-violet-200 text-indigo-700 font-bold text-xs">
              {row.original.full_name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-slate-800">{row.original.full_name}</p>
            <p className="text-xs text-slate-400">{row.original.employee_id || '—'}</p>
          </div>
        </div>
      )
    },
    {
      id: 'clock_in',
      header: 'Jam Masuk',
      cell: ({ row }) => {
        const att = row.original.attendance
        if (!att?.clock_in_time) return <span className="text-slate-300">—</span>
        return <span className="font-mono font-medium">{new Date(att.clock_in_time).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })}</span>
      }
    },
    {
      id: 'clock_out',
      header: 'Jam Keluar',
      cell: ({ row }) => {
        const att = row.original.attendance
        if (!att?.clock_out_time) return <span className="text-slate-300">—</span>
        return <span className="font-mono font-medium">{new Date(att.clock_out_time).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })}</span>
      }
    },
    {
      id: 'location',
      header: 'Lokasi Check-in',
      cell: ({ row }) => {
        const att = row.original.attendance
        if (!att?.clock_in_lat) return <span className="text-slate-300">—</span>
        return (
          <a href={`https://maps.google.com/maps?q=${att.clock_in_lat},${att.clock_in_lng}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-xs font-medium">
            Buka Peta
          </a>
        )
      }
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.attendance.status} />
    }
  ]

  return (
    <AppShell>
      <PageHeader
        title="Kehadiran Tim"
        description="Pantau laporan kehadiran anggota tim Anda per hari"
        icon={CheckSquare}
        breadcrumbs={[{ label: 'Manager Portal' }, { label: 'Kehadiran Tim' }]}
      />

      <Card className="card-premium">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-600">Pilih Tanggal:</span>
            </div>
            <DatePicker 
              value={date} 
              onChange={val => setDate(val)} 
              className="w-48 bg-white"
            />
          </div>

          <DataTable
            columns={columns}
            data={attendances || []}
            loading={isLoading}
            searchPlaceholder="Cari anggota tim..."
            emptyMessage="Tidak ada anggota tim."
          />
        </CardContent>
      </Card>
    </AppShell>
  )
}
