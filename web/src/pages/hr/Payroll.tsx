import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { DollarSign, Download, PlayCircle, FileText, CheckCircle, Save } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { DataTable } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { StatsCard } from '@/components/ui/StatsCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { calculatePayroll, formatCurrency } from '@/lib/payroll-calculator'
import { exportPayrollToExcel } from '@/lib/excel-export'
import type { Payslip, Profile } from '@/types/database'

export function PayrollAdmin() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [year, setYear] = useState(today.getFullYear())
  const [generateOpen, setGenerateOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)

  const { data: payslips, isLoading } = useQuery({
    queryKey: ['payslips-hr', month, year],
    queryFn: async () => {
      const { data } = await supabase
        .from('payslips')
        .select('*, profiles!inner(full_name, employee_id, bank_name, bank_account, base_salary, meal_allowance, transport_allowance)')
        .eq('month', month)
        .eq('year', year)
      return data as (Payslip & { profiles: Profile })[]
    },
  })

  const stats = {
    total: payslips?.reduce((sum, p) => sum + p.net_salary, 0) || 0,
    gross: payslips?.reduce((sum, p) => sum + p.gross_salary, 0) || 0,
    count: payslips?.length || 0,
    published: payslips?.filter(p => p.status === 'published').length || 0,
  }

  const generateMutation = useMutation({
    mutationFn: async () => {
      // 1. Get all active employees
      const { data: employees } = await supabase.from('profiles').select('id, base_salary, meal_allowance, transport_allowance').eq('status', 'active')
      if (!employees || employees.length === 0) throw new Error('Tidak ada karyawan aktif')
      
      const startPeriod = `${year}-${String(month).padStart(2, '0')}-01`
      const endPeriod = new Date(year, month, 0).toISOString().slice(0, 10)

      const inserts = await Promise.all(employees.map(async emp => {
        // Query approved overtime hours for this employee in the period
        const { data: otData } = await supabase
          .from('overtimes')
          .select('hours')
          .eq('user_id', emp.id)
          .eq('status', 'approved')
          .gte('date', startPeriod)
          .lte('date', endPeriod)
        const totalOvertimeHours = otData?.reduce((sum, o) => sum + (o.hours || 0), 0) || 0
        // Overtime pay: 1/173 x gaji pokok x multiplier (1.5x jam pertama, 2x selanjutnya)
        const hourlyRate = emp.base_salary / 173
        const overtimePay = totalOvertimeHours > 0
          ? Math.round(hourlyRate * 1.5 + hourlyRate * 2 * Math.max(0, totalOvertimeHours - 1))
          : 0

        // Query approved reimbursements for this employee in the period
        const { data: reimbData } = await supabase
          .from('reimbursements')
          .select('amount')
          .eq('user_id', emp.id)
          .eq('status', 'approved')
          .gte('created_at', startPeriod)
          .lte('created_at', endPeriod + 'T23:59:59')
        const reimbursementTotal = reimbData?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0

        // Query active loan installment amount
        const { data: loanData } = await supabase
          .from('employee_loans')
          .select('installment_amount')
          .eq('user_id', emp.id)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle()
        const loanDeduction = loanData?.installment_amount || 0

        const res = calculatePayroll({
          baseSalary: emp.base_salary,
          mealAllowance: emp.meal_allowance || 0,
          transportAllowance: emp.transport_allowance || 0,
          overtimePay,
          reimbursementTotal,
          loanDeduction,
          ptkpStatus: 'TK0' // TODO: add ptkp_status to profiles table
        })

        return {
          user_id: emp.id, month, year, status: 'draft',
          base_salary: res.baseSalary, gross_salary: res.grossSalary,
          allowances: { meal: res.mealAllowance, transport: res.transportAllowance },
          overtime_pay: res.overtimePay, reimbursement_total: res.reimbursementTotal, loan_deduction: res.loanDeduction,
          bpjs_kesehatan_employee: res.bpjsKesehatanEmployee, bpjs_kesehatan_employer: res.bpjsKesehatanEmployer,
          bpjs_jht_employee: res.bpjsJhtEmployee, bpjs_jht_employer: res.bpjsJhtEmployer,
          bpjs_jp_employee: res.bpjsJpEmployee, bpjs_jp_employer: res.bpjsJpEmployer,
          bpjs_jkk: res.bpjsJkk, bpjs_jkm: res.bpjsJkm, pph21: res.pph21,
          deductions: res.totalEmployeeDeductions, total_deductions: res.totalEmployeeDeductions,
          net_salary: res.netSalary, period_start: startPeriod, period_end: endPeriod
        }
      }))

      const { error } = await supabase.from('payslips').upsert(inserts, { onConflict: 'user_id, month, year' })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payslips-hr'] })
      toast({ title: 'Berhasil', description: 'Draft gaji berhasil di-generate.' })
      setGenerateOpen(false)
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const publishMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('payslips').update({ status: 'published', published_at: new Date().toISOString() })
        .eq('month', month).eq('year', year).eq('status', 'draft')
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payslips-hr'] })
      toast({ title: 'Dipublikasikan', description: 'Slip gaji sekarang dapat dilihat oleh karyawan.' })
      setPublishOpen(false)
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const columns: ColumnDef<Payslip & { profiles: Profile }>[] = [
    { accessorKey: 'profiles.employee_id', header: 'ID', cell: ({ getValue }) => <span className="text-xs text-slate-500 font-mono">{getValue() as string || '—'}</span> },
    { accessorKey: 'profiles.full_name', header: 'Nama Karyawan', cell: ({ getValue }) => <span className="font-semibold">{getValue() as string}</span> },
    { accessorKey: 'base_salary', header: 'Gaji Pokok', cell: ({ getValue }) => <span className="font-mono text-sm">{formatCurrency(getValue() as number)}</span> },
    { accessorKey: 'total_deductions', header: 'Potongan (BPJS/PPh)', cell: ({ getValue }) => <span className="font-mono text-sm text-red-600">{formatCurrency(getValue() as number)}</span> },
    { accessorKey: 'net_salary', header: 'Gaji Bersih', cell: ({ getValue }) => <span className="font-mono text-sm font-semibold text-emerald-600">{formatCurrency(getValue() as number)}</span> },
    { accessorKey: 'profiles.bank_account', header: 'Rekening', cell: ({ row }) => <span className="text-xs">{row.original.profiles?.bank_name} - {row.original.profiles?.bank_account}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
  ]

  return (
    <AppShell>
      <PageHeader
        title="Payroll & BPJS"
        description="Kelola perhitungan gaji, tunjangan, potongan BPJS, dan PPh 21"
        icon={DollarSign}
        breadcrumbs={[{ label: 'HR Portal' }, { label: 'Payroll' }]}
        actions={
          <>
            <Button variant="outline" onClick={() => exportPayrollToExcel(payslips || [])} className="gap-2 bg-white">
              <Download className="h-4 w-4" /> Export Excel
            </Button>
            <Button onClick={() => setGenerateOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <PlayCircle className="h-4 w-4" /> Generate Gaji
            </Button>
          </>
        }
      />

      {/* Filter */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Select value={month.toString()} onValueChange={v => setMonth(+v)}>
            <SelectTrigger className="w-40 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i} value={(i + 1).toString()}>{new Date(2024, i, 1).toLocaleDateString('id-ID', { month: 'long' })}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year.toString()} onValueChange={v => setYear(+v)}>
            <SelectTrigger className="w-28 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2023, 2024, 2025, 2026].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        
        {stats.count > 0 && stats.published < stats.count && (
          <Button onClick={() => setPublishOpen(true)} className="gap-2 bg-emerald-500 hover:bg-emerald-600">
            <CheckCircle className="h-4 w-4" /> Publish Slip Gaji to Karyawan
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stagger">
        <StatsCard title="Total Gaji Bersih Terbayar" value={formatCurrency(stats.total)} icon={DollarSign} color="emerald" />
        <StatsCard title="Slip Di-generate" value={stats.count} icon={FileText} color="indigo" />
        <StatsCard title="Draft" value={stats.count - stats.published} icon={Save} color="amber" />
        <StatsCard title="Published" value={stats.published} icon={CheckCircle} color="teal" />
      </div>

      <Card className="card-premium">
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={payslips || []}
            loading={isLoading}
            searchPlaceholder="Cari nama karyawan atau ID..."
            emptyMessage={`Belum ada data gaji digenerate untuk periode ini.`}
          />
        </CardContent>
      </Card>

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Generate Kalkulasi Gaji?</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">Sistem akan menghitung ulang gaji, lembur, dan potongan BPJS/PPh 21 untuk bulan {month}/{year}. Data lama (jika masih draft) akan ditimpa.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>Batal</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? 'Menghitung...' : 'Mulai Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-emerald-600">Publish Slip Gaji?</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">Tindakan ini akan mempublikasikan draft slip gaji ke portal karyawan. Setelah dipublish, slip tidak dapat diubah lagi.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishOpen(false)}>Batal</Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
              {publishMutation.isPending ? 'Memproses...' : 'Publish Sekarang'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
