import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { ClipboardList, CheckCircle, XCircle } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { DataTable } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { StatsCard } from '@/components/ui/StatsCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import type { Overtime } from '@/types/database'

export function OvertimeAdmin() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')

  const { data: overtimes, isLoading } = useQuery({
    queryKey: ['overtimes-hr'],
    queryFn: async () => {
      const { data } = await supabase
        .from('overtimes')
        .select('*, profiles!inner(full_name, employee_id, avatar_url, base_salary)')
        .order('created_at', { ascending: false })
      return data as Overtime[]
    },
  })

  const stats = {
    all: overtimes?.length || 0,
    pending: overtimes?.filter(r => r.status.startsWith('pending')).length || 0,
    approved: overtimes?.filter(r => r.status === 'approved').length || 0,
    rejected: overtimes?.filter(r => r.status === 'rejected').length || 0,
  }

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('overtimes').update({ 
        status: 'approved', 
        hr_approved_at: new Date().toISOString()
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtimes-hr'] })
      toast({ title: 'Disetujui', description: 'Pengajuan lembur disetujui.' })
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string, note: string }) => {
      const { error } = await supabase.from('overtimes').update({ 
        status: 'rejected',
        hr_note: note
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtimes-hr'] })
      toast({ title: 'Ditolak', description: 'Pengajuan lembur ditolak.' })
      setRejectId(null)
      setRejectNote('')
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const columns: ColumnDef<Overtime>[] = [
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
    { 
      accessorKey: 'date', 
      header: 'Tanggal', 
      cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString('id-ID', { dateStyle: 'medium' }) 
    },
    {
      id: 'time',
      header: 'Waktu',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium">{row.original.start_time} — {row.original.end_time}</p>
          <p className="text-xs text-slate-400">{row.original.hours} Jam</p>
        </div>
      ),
    },
    { accessorKey: 'reason', header: 'Alasan', cell: ({ getValue }) => <span className="text-sm text-slate-600 line-clamp-2 w-48">{getValue() as string}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
    {
      id: 'actions',
      header: 'Aksi HR',
      cell: ({ row }) => {
        if (row.original.status !== 'pending_hr') return <span className="text-xs text-slate-400">—</span>
        return (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => approveMutation.mutate(row.original.id)}
              className="h-7 gap-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs">
              <CheckCircle className="h-3.5 w-3.5" /> Setuju
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRejectId(row.original.id)}
              className="h-7 gap-1 text-red-600 border-red-200 hover:bg-red-50 text-xs">
              <XCircle className="h-3.5 w-3.5" /> Tolak
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <AppShell>
      <PageHeader
        title="Pengajuan Lembur (Overtime)"
        description="Kelola dan setujui pengajuan kerja lembur karyawan"
        icon={ClipboardList}
        breadcrumbs={[{ label: 'HR Portal' }, { label: 'Lembur' }]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stagger">
        <StatsCard title="Total Pengajuan" value={stats.all} icon={ClipboardList} color="indigo" />
        <StatsCard title="Menunggu HR" value={stats.pending} icon={ClipboardList} color="amber" />
        <StatsCard title="Disetujui" value={stats.approved} icon={ClipboardList} color="emerald" />
        <StatsCard title="Ditolak" value={stats.rejected} icon={ClipboardList} color="rose" />
      </div>

      <Card className="card-premium">
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={overtimes || []}
            loading={isLoading}
            searchPlaceholder="Cari karyawan atau tanggal..."
            emptyMessage="Belum ada pengajuan lembur."
          />
        </CardContent>
      </Card>

      <Dialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Tolak Pengajuan Lembur</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label>Alasan Penolakan</Label>
            <Textarea
              className="mt-2"
              placeholder="Masukkan alasan penolakan..."
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => rejectId && rejectMutation.mutate({ id: rejectId, note: rejectNote })} disabled={rejectMutation.isPending}>
              {rejectMutation.isPending ? 'Memproses...' : 'Tolak Pengajuan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
