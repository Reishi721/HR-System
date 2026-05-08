import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Calendar, CheckCircle, XCircle, MapPin } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { DataTable } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { StatsCard } from '@/components/ui/StatsCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import type { LeaveRequest } from '@/types/database'

export function LeaveRequests() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: requests, isLoading } = useQuery({
    queryKey: ['leave-requests-hr'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leave_requests')
        .select('*, profiles!inner(full_name, employee_id, avatar_url)')
        .order('created_at', { ascending: false })
      return data as LeaveRequest[]
    },
  })

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leave_requests').update({ status: 'approved', hr_approved_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests-hr'] })
      toast({ title: '✅ Disetujui HR', description: 'Pengajuan cuti disetujui. Saldo cuti terpotong otomatis.' })
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leave_requests').update({ status: 'rejected' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests-hr'] })
      toast({ title: '❌ Ditolak', description: 'Pengajuan cuti ditolak.', variant: 'destructive' })
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const stats = {
    all: requests?.length || 0,
    pending: requests?.filter(r => r.status.startsWith('pending')).length || 0,
    approved: requests?.filter(r => r.status === 'approved').length || 0,
    rejected: requests?.filter(r => r.status === 'rejected').length || 0,
  }

  const columns: ColumnDef<LeaveRequest>[] = [
    {
      id: 'employee',
      header: 'Karyawan',
      cell: ({ row }) => {
        const p = (row.original as any).profiles
        return (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-300 to-violet-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {p?.full_name?.[0]}
            </div>
            <div>
              <p className="text-sm font-medium">{p?.full_name}</p>
              <p className="text-xs text-slate-400">{p?.employee_id || '—'}</p>
            </div>
          </div>
        )
      },
    },
    { accessorKey: 'type', header: 'Jenis', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
    {
      id: 'period',
      header: 'Periode',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium">{row.original.start_date} — {row.original.end_date}</p>
          <p className="text-xs text-slate-400">{Math.ceil((new Date(row.original.end_date).getTime() - new Date(row.original.start_date).getTime()) / 86400000) + 1} hari</p>
        </div>
      ),
    },
    { accessorKey: 'reason', header: 'Alasan', cell: ({ getValue }) => <span className="text-sm text-slate-600 line-clamp-1">{(getValue() as string) || '—'}</span> },
    {
      id: 'location',
      header: 'Lokasi GPS',
      cell: ({ row }) => row.original.location_lat ? (
        <a href={`https://maps.google.com/maps?q=${row.original.location_lat},${row.original.location_lng}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
          <MapPin className="h-3 w-3" /> Lihat Peta
        </a>
      ) : <span className="text-slate-300 text-xs">—</span>,
    },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
    {
      id: 'actions',
      header: 'Aksi HR',
      cell: ({ row }) => row.original.status === 'pending_hr' ? (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => approveMutation.mutate(row.original.id)}
            className="h-7 gap-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs">
            <CheckCircle className="h-3.5 w-3.5" /> Setuju
          </Button>
          <Button size="sm" variant="outline" onClick={() => rejectMutation.mutate(row.original.id)}
            className="h-7 gap-1 text-red-600 border-red-200 hover:bg-red-50 text-xs">
            <XCircle className="h-3.5 w-3.5" /> Tolak
          </Button>
        </div>
      ) : <span className="text-xs text-slate-400">—</span>,
    },
  ]

  return (
    <AppShell>
      <PageHeader
        title="Pengajuan Cuti"
        description="Kelola dan setujui semua pengajuan cuti karyawan"
        icon={Calendar}
        breadcrumbs={[{ label: 'HR Portal' }, { label: 'Cuti' }]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stagger">
        <StatsCard title="Total Pengajuan" value={stats.all} icon={Calendar} color="indigo" />
        <StatsCard title="Menunggu" value={stats.pending} icon={Calendar} color="amber" />
        <StatsCard title="Disetujui" value={stats.approved} icon={Calendar} color="emerald" />
        <StatsCard title="Ditolak" value={stats.rejected} icon={Calendar} color="rose" />
      </div>

      <Card className="card-premium">
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={requests || []}
            loading={isLoading}
            searchPlaceholder="Cari karyawan atau jenis cuti..."
            emptyMessage="Belum ada pengajuan cuti."
          />
        </CardContent>
      </Card>
    </AppShell>
  )
}
