import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Landmark, CheckCircle, XCircle, Plus, Trash2, MoreHorizontal } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AppShell } from '@/components/layout/AppShell'
import { DataTable } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/payroll-calculator'
import type { Profile } from '@/types/database'

const loanSchema = z.object({
  user_id: z.string().min(1, 'Pilih karyawan'),
  amount: z.coerce.number().min(100000, 'Minimal Rp 100.000'),
  installment_count: z.coerce.number().min(1, 'Minimal 1 bulan').max(60, 'Maksimal 60 bulan'),
  purpose: z.string().min(5, 'Isi tujuan pinjaman'),
})
type LoanForm = z.infer<typeof loanSchema>

export function Loans() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)

  const { data: loans, isLoading } = useQuery({
    queryKey: ['loans-hr'],
    queryFn: async () => {
      const { data } = await supabase
        .from('employee_loans')
        .select('*, profiles!inner(full_name, employee_id, avatar_url), loan_installments(amount, status)')
        .order('created_at', { ascending: false })
      return data as any[]
    },
  })

  const { data: employees } = useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').eq('status', 'active')
      return data as Pick<Profile, 'id' | 'full_name'>[]
    },
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<LoanForm>({
    resolver: zodResolver(loanSchema) as any,
    defaultValues: { installment_count: 12 }
  })
  const watchedAmount = watch('amount') || 0
  const watchedCount = watch('installment_count') || 1

  const addMutation = useMutation({
    mutationFn: async (values: LoanForm) => {
      const installmentAmount = Math.ceil(values.amount / values.installment_count)
      const { error } = await supabase.from('employee_loans').insert({ ...values, installment_amount: installmentAmount, status: 'active', disbursed_at: new Date().toISOString() }) // Auto active if HR adds directly
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans-hr'] })
      toast({ title: 'Tersimpan', description: 'Pinjaman berhasil ditambahkan dan disetujui (aktif).' })
      setOpen(false)
      reset()
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employee_loans').update({ status: 'active', disbursed_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans-hr'] })
      toast({ title: 'Disetujui', description: 'Pinjaman disetujui, cicilan digenerate otomatis.' })
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })



  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employee_loans').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans-hr'] })
      toast({ title: 'Dihapus', description: 'Data pinjaman berhasil dihapus.' })
      setDeleteTarget(null)
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const writeOffMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employee_loans').update({ status: 'completed' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans-hr'] })
      toast({ title: 'Selesai', description: 'Pinjaman ditandai lunas/selesai.' })
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const columns: ColumnDef<any>[] = [
    {
      id: 'employee',
      header: 'Karyawan',
      cell: ({ row }) => {
        const p = row.original.profiles
        return (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-300 to-violet-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {p?.full_name?.[0]}
            </div>
            <div>
              <p className="text-sm font-semibold">{p?.full_name}</p>
              <p className="text-xs text-slate-400">{p?.employee_id || '—'}</p>
            </div>
          </div>
        )
      },
    },
    { accessorKey: 'purpose', header: 'Tujuan', cell: ({ getValue }) => <span className="text-sm">{getValue() as string}</span> },
    { 
      accessorKey: 'amount', 
      header: 'PinjamanPokok', 
      cell: ({ row }) => (
        <div>
          <p className="font-mono font-semibold text-slate-800">{formatCurrency(row.original.amount)}</p>
          <p className="text-xs text-slate-500">{row.original.installment_count}x @ {formatCurrency(row.original.installment_amount)}</p>
        </div>
      ) 
    },
    { 
      id: 'progress', 
      header: 'Progress Cicilan', 
      cell: ({ row }) => {
        const installs = row.original.loan_installments || []
        const paid = installs.filter((i:any) => i.status === 'paid').length
        const total = installs.length || row.original.installment_count
        const percentage = total === 0 ? 0 : Math.round((paid / total) * 100)
        return (
          <div className="w-full max-w-[120px]">
            <div className="flex justify-between text-xs mb-1"><span className="text-slate-600">{paid}/{total}</span><span className="font-medium">{percentage}%</span></div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${percentage}%` }} />
            </div>
          </div>
        )
      } 
    },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
    {
      id: 'actions',
      header: 'Aksi HR',
      cell: ({ row }) => {
        const status = row.original.status
        if (status === 'pending') {
          return (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => approveMutation.mutate(row.original.id)}
                className="h-7 gap-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs">
                <CheckCircle className="h-3.5 w-3.5" /> Cairkan
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                if (confirm('Tolak pengajuan ini?')) {
                  supabase.from('employee_loans').update({ status: 'rejected' }).eq('id', row.original.id)
                    .then(() => {
                      queryClient.invalidateQueries({ queryKey: ['loans-hr'] })
                      toast({ title: 'Ditolak', description: 'Pengajuan pinjaman ditolak.' })
                    })
                }
              }}
                className="h-7 gap-1 text-red-600 border-red-200 hover:bg-red-50 text-xs">
                <XCircle className="h-3.5 w-3.5" /> Tolak
              </Button>
            </div>
          )
        }
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {status === 'active' && (
                <DropdownMenuItem onClick={() => writeOffMutation.mutate(row.original.id)} className="gap-2">
                  <CheckCircle className="h-3.5 w-3.5" /> Tandai Lunas
                </DropdownMenuItem>
              )}
              {(status === 'rejected' || status === 'completed') && (
                <DropdownMenuItem className="gap-2 text-red-600 focus:text-red-600" onClick={() => setDeleteTarget(row.original)}>
                  <Trash2 className="h-3.5 w-3.5" /> Hapus Data
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <AppShell>
      <PageHeader
        title="Pinjaman Karyawan"
        description="Kelola pengajuan Kasbon/Pinjaman dan angsuran via Payroll"
        icon={Landmark}
        breadcrumbs={[{ label: 'HR Portal' }, { label: 'Pinjaman' }]}
        actions={
          <Button onClick={() => { reset(); setOpen(true) }} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Input Pinjaman
          </Button>
        }
      />

      <Card className="card-premium">
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={loans || []}
            loading={isLoading}
            searchPlaceholder="Cari karyawan..."
            emptyMessage="Belum ada data pinjaman."
          />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Input Pinjaman Baru</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => addMutation.mutate(d as unknown as LoanForm))} className="space-y-4 mt-2">
            <div>
              <Label>Karyawan *</Label>
              <Select onValueChange={v => setValue('user_id', v)}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih karyawan" /></SelectTrigger>
                <SelectContent>{employees?.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nominal Pinjaman(Rp) *</Label>
                <Input type="number" {...register('amount')} className="mt-1.5" />
                {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
              </div>
              
              <div>
                <Label>Lama Cicilan (Bulan) *</Label>
                <Input type="number" {...register('installment_count')} className="mt-1.5" />
              </div>
              
              <div>
                <Label>Potongan per Bulan</Label>
                <Input value={watchedCount > 0 ? formatCurrency(watchedAmount / watchedCount) : 0} disabled className="mt-1.5 bg-slate-50 font-mono text-sm" />
              </div>

              <div className="col-span-2">
                <Label>Tujuan Kasbon/Pinjaman *</Label>
                <Input {...register('purpose')} className="mt-1.5" placeholder="Biaya sekolah, pengobatan..." />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">Simpan & Aktifkan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Hapus Data Pinjaman?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">Data pinjaman <strong>{deleteTarget?.profiles?.full_name}</strong> sebesar <strong>{formatCurrency(deleteTarget?.amount || 0)}</strong> akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
              {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
