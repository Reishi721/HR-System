import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Receipt, CheckCircle, XCircle, FileText, Image as ImageIcon } from 'lucide-react'
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
import { formatCurrency } from '@/lib/payroll-calculator'
import type { Reimbursement } from '@/types/database'

export function ReimbursementAdmin() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const { data: reimbursements, isLoading } = useQuery({
    queryKey: ['reimbursements-hr'],
    queryFn: async () => {
      const { data } = await supabase
        .from('reimbursements')
        .select('*, profiles!inner(full_name, employee_id, avatar_url)')
        .order('created_at', { ascending: false })
      return data as Reimbursement[]
    },
  })

  const stats = {
    pendingAmount: reimbursements?.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0) || 0,
    pending: reimbursements?.filter(r => r.status === 'pending').length || 0,
    approved: reimbursements?.filter(r => r.status === 'approved').length || 0,
    paid: reimbursements?.filter(r => r.status === 'paid').length || 0,
  }

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('reimbursements').update({ 
        status: 'approved', 
        approved_at: new Date().toISOString()
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reimbursements-hr'] })
      toast({ title: 'Disetujui', description: 'Reimbursement disetujui. Siap dibayar di payroll.' })
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string, note: string }) => {
      const { error } = await supabase.from('reimbursements').update({ 
        status: 'rejected',
        note: note
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reimbursements-hr'] })
      toast({ title: 'Ditolak', description: 'Klaim reimbursement ditolak.' })
      setRejectId(null)
      setRejectNote('')
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const columns: ColumnDef<Reimbursement>[] = [
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
      accessorKey: 'category', 
      header: 'Kategori', 
      cell: ({ getValue }) => <span className="capitalize font-medium text-slate-700">{getValue() as string}</span> 
    },
    { 
      accessorKey: 'amount', 
      header: 'Nominal', 
      cell: ({ getValue }) => <span className="font-mono font-medium text-slate-800">{formatCurrency(getValue() as number)}</span> 
    },
    { accessorKey: 'description', header: 'Keterangan', cell: ({ getValue }) => <span className="text-sm text-slate-600 line-clamp-1 max-w-[200px]">{getValue() as string}</span> },
    {
      accessorKey: 'attachment_url',
      header: 'Bukti',
      cell: ({ getValue }) => {
        const url = getValue() as string
        if (!url) return <span className="text-slate-400 text-sm">—</span>
        return (
          <Button variant="ghost" size="sm" onClick={() => setSelectedImage(url)} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium bg-indigo-50 hover:bg-indigo-100 h-7 px-2">
            {url.match(/\.(jpg|jpeg|png|webp)$/i) ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
            Lihat Bukti
          </Button>
        )
      }
    },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
    {
      id: 'actions',
      header: 'Aksi HR',
      cell: ({ row }) => {
        if (row.original.status !== 'pending') return <span className="text-xs text-slate-400">—</span>
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
        title="Reimbursement"
        description="Kelola klaim pengeluaran (reimbursement) karyawan"
        icon={Receipt}
        breadcrumbs={[{ label: 'HR Portal' }, { label: 'Reimbursement' }]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stagger">
        <StatsCard title="Total Nominal Pending" value={formatCurrency(stats.pendingAmount)} icon={Receipt} color="amber" />
        <StatsCard title="Klaim Pending" value={stats.pending} icon={Receipt} color="violet" />
        <StatsCard title="Disetujui (Belum Dibayar)" value={stats.approved} icon={CheckCircle} color="indigo" />
        <StatsCard title="Sudah Dibayar" value={stats.paid} icon={CheckCircle} color="emerald" />
      </div>

      <Card className="card-premium">
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={reimbursements || []}
            loading={isLoading}
            searchPlaceholder="Cari karyawan atau keterangan..."
            emptyMessage="Belum ada klaim reimbursement."
          />
        </CardContent>
      </Card>

      <Dialog open={!!rejectId} onOpenChange={() => setRejectId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Tolak Reimbursement</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label>Alasan Penolakan</Label>
            <Textarea
              className="mt-2"
              placeholder="Bukti struk tidak jelas..."
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => rejectId && rejectMutation.mutate({ id: rejectId, note: rejectNote })} disabled={rejectMutation.isPending}>
              {rejectMutation.isPending ? 'Memproses...' : 'Tolak Klaim'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attachment Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-none shadow-none flex items-center justify-center">
          <DialogHeader className="hidden">
            <DialogTitle>Bukti Attachment</DialogTitle>
          </DialogHeader>
          <div className="relative w-full flex items-center justify-center">
            {selectedImage?.match(/\.(pdf)$/i) ? (
              <iframe src={selectedImage} className="w-full h-[80vh] rounded-xl bg-white" />
            ) : selectedImage ? (
              <img src={selectedImage} alt="Bukti" className="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
