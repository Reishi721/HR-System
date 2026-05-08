import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { BookOpen, Filter } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { DataTable } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import type { AuditLog } from '@/types/database'

export function AuditLogAdmin() {
  const [moduleFilter, setModuleFilter] = useState<string>('all')

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', moduleFilter],
    queryFn: async () => {
      let q = supabase
        .from('audit_logs')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(200) // limit for performance
        
      if (moduleFilter !== 'all') {
        q = q.eq('module', moduleFilter)
      }
      
      const { data } = await q
      return data as AuditLog[]
    },
  })

  const columns: ColumnDef<AuditLog>[] = [
    {
      accessorKey: 'created_at',
      header: 'Waktu',
      cell: ({ getValue }) => (
        <div className="w-[140px]">
          <span className="text-xs text-slate-500 block">
            {new Date(getValue() as string).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <span className="font-mono text-sm font-medium text-slate-700">
            {new Date(getValue() as string).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      )
    },
    {
      id: 'user',
      header: 'User (Pelaku)',
      cell: ({ row }) => {
        const name = (row.original as any).profiles?.full_name || 'System'
        return <span className="text-sm font-semibold text-indigo-700">{name}</span>
      }
    },
    {
      accessorKey: 'action',
      header: 'Aksi',
      cell: ({ getValue }) => {
        const action = getValue() as string
        let color = 'bg-slate-100 text-slate-700'
        if (action === 'CREATE') color = 'bg-emerald-100 text-emerald-700'
        else if (action === 'UPDATE' || action === 'APPROVE') color = 'bg-blue-100 text-blue-700'
        else if (action === 'DELETE' || action === 'REJECT') color = 'bg-red-100 text-red-700'
        return <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold tracking-wider ${color}`}>{action}</span>
      }
    },
    {
      accessorKey: 'module',
      header: 'Modul',
      cell: ({ getValue }) => <span className="text-sm text-slate-600 capitalize">{String(getValue()).replace('_', ' ')}</span>
    },
    {
      accessorKey: 'record_label',
      header: 'Target Data',
      cell: ({ getValue }) => <span className="text-sm font-medium text-slate-800">{getValue() as string || '—'}</span>
    },
  ]

  return (
    <AppShell>
      <PageHeader
        title="Audit Log Sistem"
        description="Riwayat lengkap perubahan data dan aktivitas penting di sistem"
        icon={BookOpen}
        breadcrumbs={[{ label: 'HR Portal' }, { label: 'Audit Log' }]}
      />

      <Card className="card-premium">
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={logs || []}
            loading={isLoading}
            searchPlaceholder="Cari data yang diubah atau nama kegiatan..."
            emptyMessage="Tidak ada catatan audit."
            pageSize={15}
            toolbar={
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <Select value={moduleFilter} onValueChange={setModuleFilter}>
                  <SelectTrigger className="w-[180px] bg-white h-9 text-sm">
                    <SelectValue placeholder="Pilih Modul" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Modul</SelectItem>
                    <SelectItem value="leave_requests">Pengajuan Cuti</SelectItem>
                    <SelectItem value="overtimes">Lembur</SelectItem>
                    <SelectItem value="reimbursements">Reimbursement</SelectItem>
                    <SelectItem value="payslips">Payroll & Slip Gaji</SelectItem>
                    <SelectItem value="contracts">Kontrak Pekerja</SelectItem>
                    <SelectItem value="employee_loans">Pinjaman Kaaryawan</SelectItem>
                    <SelectItem value="profiles">Data Karyawan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
          />
        </CardContent>
      </Card>
    </AppShell>
  )
}
