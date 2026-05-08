import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Landmark, Plus } from 'lucide-react'
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
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/payroll-calculator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
const loanSchema = z.object({
  amount: z.coerce.number().min(500000, 'Minimal Rp 500.000'),
  installment_count: z.coerce.number().min(1, 'Minimal 1 bulan').max(60, 'Maksimal 60 bulan'),
  purpose: z.string().min(5, 'Isi tujuan pinjaman'),
})
type LoanForm = z.infer<typeof loanSchema>

export function LoansEmployee() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data: loans, isLoading } = useQuery({
    queryKey: ['employee-loans', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data } = await supabase
        .from('employee_loans')
        .select('*, loan_installments(amount, status, paid_at)')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
      return data as any[]
    },
    enabled: !!profile?.id,
  })

  // Prevent multiple active loans
  const hasActiveLoan = loans?.some(l => l.status === 'active' || l.status === 'pending' || l.status === 'approved')

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<LoanForm>({
    resolver: zodResolver(loanSchema),
    defaultValues: { installment_count: 6 }
  })

  const amount = watch('amount') || 0
  const count = watch('installment_count') || 1

  const submitMutation = useMutation({
    mutationFn: async (values: LoanForm) => {
      if (!profile?.id) throw new Error('Unauthenticated')
      if (hasActiveLoan) throw new Error('Anda masih memiliki pinjaman aktif atau pending yang belum lunas.')

      const installmentAmount = Math.ceil(values.amount / values.installment_count)
      const { error } = await supabase.from('employee_loans').insert({
        user_id: profile.id,
        amount: values.amount,
        purpose: values.purpose,
        installment_count: values.installment_count,
        installment_amount: installmentAmount,
        status: 'pending' // need HR approval
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-loans'] })
      toast({ title: 'Terkirim', description: 'Pengajuan pinjaman disubmit.' })
      setOpen(false)
      reset()
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const columns: ColumnDef<any>[] = [
    { accessorKey: 'purpose', header: 'Tujuan', cell: ({ getValue }) => <span className="text-sm font-medium">{getValue() as string}</span> },
    {
      accessorKey: 'amount',
      header: 'Total Pinjaman',
      cell: ({ row }) => (
        <div>
          <p className="font-mono font-semibold text-slate-800">{formatCurrency(row.original.amount)}</p>
          <p className="text-xs text-slate-500">{row.original.installment_count}x cicilan</p>
        </div>
      )
    },
    {
      id: 'installment',
      header: 'Potongan per Bulan',
      cell: ({ row }) => <span className="font-mono text-sm text-red-600">-{formatCurrency(row.original.installment_amount)}</span>
    },
    {
      id: 'progress',
      header: 'Progress Lunas',
      cell: ({ row }) => {
        const installs = row.original.loan_installments || []
        const paid = installs.filter((i: any) => i.status === 'paid').length
        const total = installs.length || row.original.installment_count
        const percentage = total === 0 ? 0 : Math.round((paid / total) * 100)
        return (
          <div className="w-full min-w-[100px]">
            <div className="flex justify-between text-xs mb-1"><span className="text-slate-600">{paid}/{total} Lunas</span><span className="font-medium">{percentage}%</span></div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${percentage}%` }} />
            </div>
          </div>
        )
      }
    },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
  ]

  return (
    <AppShell>
      <PageHeader
        title="Kasbon / Pinjaman Karyawan"
        description="Ajukan pinjaman dana dan pantau riwayat cicilan otomatis via gaji"
        icon={Landmark}
        breadcrumbs={[{ label: 'Employee Space' }, { label: 'Pinjaman' }]}
        actions={
          <Button onClick={() => setOpen(true)} disabled={hasActiveLoan} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Ajukan Pinjaman
          </Button>
        }
      />

      <Card className="card-premium">
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={loans || []}
            loading={isLoading}
            searchPlaceholder="Cari tujuan..."
            emptyMessage="Belum pernah mengajukan pinjaman/kasbon."
          />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Form Pengajuan Kasbon</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(d => submitMutation.mutate(d))} className="space-y-4 mt-2">
            <div>
              <Label>Tujuan Pinjaman *</Label>
              <Input {...register('purpose')} className="mt-1.5" placeholder="Keperluan pendidikan, medis, dsb..." />
              {errors.purpose && <p className="text-xs text-red-500 mt-1">{errors.purpose.message}</p>}
            </div>

            <div>
              <Label>Nominal Pengajuan *</Label>
              <CurrencyInput
                value={amount}
                onValueChange={(val) => reset({ ...watch(), amount: val || 0 })}
                className="mt-1.5"
              />
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
            </div>

            <div>
              <Label>Pilih Lama Cicilan *</Label>
              <Select onValueChange={(v) => reset({ ...watch(), installment_count: Number(v) })} defaultValue={count.toString()}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Bulan (Lunas Payday Depan)</SelectItem>
                  <SelectItem value="3">3 Bulan</SelectItem>
                  <SelectItem value="6">6 Bulan</SelectItem>
                  <SelectItem value="12">12 Bulan (1 Tahun)</SelectItem>
                  <SelectItem value="24">24 Bulan (2 Tahun)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex justify-between items-center">
              <div>
                <p className="text-sm font-semibold text-indigo-900">Estimasi Potongan Gaji</p>
                <p className="text-xs text-indigo-700 font-medium">per bulan selama {count}x pembayaran</p>
              </div>
              <p className="text-lg font-mono font-bold text-red-600">-{formatCurrency(count > 0 ? amount / count : 0)}</p>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
                {isSubmitting ? 'Mengajukan...' : 'Kirim Pengajuan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
