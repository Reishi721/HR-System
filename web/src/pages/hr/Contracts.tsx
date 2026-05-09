import { useState } from 'react'
import { parseISO } from 'date-fns'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { FileSignature, Plus, Edit, Trash2, MoreHorizontal, AlertTriangle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AppShell } from '@/components/layout/AppShell'
import { DataTable } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { FileUpload } from '@/components/ui/FileUpload'
import { StatsCard } from '@/components/ui/StatsCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/DatePicker'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import type { Contract, Profile } from '@/types/database'

const contractSchema = z.object({
  user_id: z.string().min(1, 'Pilih karyawan'),
  contract_number: z.string().optional(),
  contract_type: z.enum(['PKWT', 'PKWTT']),
  start_date: z.string().min(1, 'Pilih tanggal mulai'),
  end_date: z.string().optional(),
  document_url: z.string().optional(),
  status: z.enum(['draft', 'active', 'expired', 'terminated']),
})
type ContractForm = z.infer<typeof contractSchema>

export function Contracts() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Contract | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null)

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts-hr'],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('*, profiles(full_name, employee_id)')
        .order('created_at', { ascending: false })
      return data as Contract[]
    },
  })

  const { data: employees } = useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').eq('status', 'active')
      return data as Pick<Profile, 'id' | 'full_name'>[]
    },
  })

  // Count expiring soon (within 30 days)
  const expiringSoon = contracts?.filter(c => {
    if (c.status !== 'active' || !c.end_date) return false
    const end = new Date(c.end_date).getTime()
    const now = new Date().getTime()
    const diffDays = (end - now) / (1000 * 3600 * 24)
    return diffDays >= 0 && diffDays <= 30
  }).length || 0

  const stats = {
    total: contracts?.length || 0,
    active: contracts?.filter(c => c.status === 'active').length || 0,
    expiringSoon,
    expired: contracts?.filter(c => c.status === 'expired').length || 0,
  }

  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm<ContractForm>({
    resolver: zodResolver(contractSchema),
    defaultValues: { contract_type: 'PKWT', status: 'active' },
  })
  
  const contractType = watch('contract_type')
  const docUrl = watch('document_url')
  const startDateStr = watch('start_date')
  const minEndDate = startDateStr ? parseISO(startDateStr) : undefined

  const saveMutation = useMutation({
    mutationFn: async (values: ContractForm) => {
      // If PKWTT, ensure end_date is null
      const data = { ...values, end_date: values.contract_type === 'PKWTT' ? null : values.end_date }
      if (editing) {
        const { error } = await supabase.from('contracts').update(data).eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('contracts').insert(data)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts-hr'] })
      toast({ title: 'Tersimpan', description: 'Data kontrak berhasil disimpan.' })
      setOpen(false)
      setEditing(null)
      reset()
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contracts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts-hr'] })
      toast({ title: 'Dihapus', description: 'Data kontrak berhasil dihapus.' })
      setDeleteTarget(null)
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  function openEdit(c: Contract) {
    setEditing(c)
    reset({
      user_id: c.user_id,
      contract_number: c.contract_number || '',
      contract_type: c.contract_type,
      start_date: c.start_date,
      end_date: c.end_date || '',
      document_url: c.document_url || '',
      status: c.status,
    })
    setOpen(true)
  }

  const columns: ColumnDef<Contract>[] = [
    {
      id: 'employee',
      header: 'Karyawan',
      cell: ({ row }) => {
        const p = (row.original as any).profiles
        return (
          <div>
            <p className="text-sm font-semibold text-slate-800">{p?.full_name}</p>
            <p className="text-xs text-slate-400">{p?.employee_id || '—'}</p>
          </div>
        )
      },
    },
    { accessorKey: 'contract_number', header: 'Nomor Kontrak', cell: ({ getValue }) => <span className="text-sm font-mono">{getValue() as string || '—'}</span> },
    { accessorKey: 'contract_type', header: 'Jenis', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
    { 
      id: 'period', 
      header: 'Periode', 
      cell: ({ row }) => (
        <span className="text-sm">
          {new Date(row.original.start_date).toLocaleDateString('id-ID')} - {row.original.end_date ? new Date(row.original.end_date).toLocaleDateString('id-ID') : 'Seterusnya'}
        </span>
      ) 
    },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
    {
      id: 'document',
      header: 'Dokumen',
      cell: ({ row }) => row.original.document_url ? (
        <a href={row.original.document_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">Buka PDF</a>
      ) : <span className="text-slate-400 text-xs">—</span>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => openEdit(row.original)} className="gap-2">
              <Edit className="h-3.5 w-3.5" /> Edit Kontrak
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-red-600 focus:text-red-600" onClick={() => setDeleteTarget(row.original)}>
              <Trash2 className="h-3.5 w-3.5" /> Hapus Kontrak
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <AppShell>
      <PageHeader
        title="Kontrak Kerja (PKWT/PKWTT)"
        description="Manajemen status karyawan dan masa berlaku kontrak"
        icon={FileSignature}
        breadcrumbs={[{ label: 'HR Portal' }, { label: 'Kontrak' }]}
        actions={
          <Button onClick={() => { setEditing(null); reset(); setOpen(true) }} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Tambah Kontrak
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stagger">
        <StatsCard title="Total Kontrak" value={stats.total} icon={FileSignature} color="indigo" />
        <StatsCard title="Kontrak Aktif" value={stats.active} icon={FileSignature} color="emerald" />
        <StatsCard title="Akan Habis < 30 Hari" value={stats.expiringSoon} icon={AlertTriangle} color="amber" />
        <StatsCard title="Sudah Habis" value={stats.expired} icon={AlertTriangle} color="rose" />
      </div>

      <Card className="card-premium">
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={contracts || []}
            loading={isLoading}
            searchPlaceholder="Cari nama karyawan atau nomor kontrak..."
            emptyMessage="Belum ada data kontrak."
          />
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Edit Kontrak' : 'Tambah Kontrak'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="space-y-4 mt-2">
            <div>
              <Label>Karyawan *</Label>
              <Select onValueChange={v => setValue('user_id', v)} defaultValue={editing?.user_id}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih karyawan" /></SelectTrigger>
                <SelectContent>{employees?.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Label>Nomor Kontrak</Label><Input {...register('contract_number')} className="mt-1.5" /></div>
              
              <div>
                <Label>Jenis Kontrak *</Label>
                <Select onValueChange={v => setValue('contract_type', v as any)} defaultValue={editing?.contract_type || 'PKWT'}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PKWT">PKWT (Kontrak)</SelectItem>
                    <SelectItem value="PKWTT">PKWTT (Tetap)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Status</Label>
                <Select onValueChange={v => setValue('status', v as any)} defaultValue={editing?.status || 'active'}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tanggal Mulai *</Label>
                <DatePicker value={watch('start_date')} onChange={v => setValue('start_date', v)} className="mt-1.5" placeholder="Pilih Mulai" />
              </div>
              
              {contractType === 'PKWT' && (
                <div>
                  <Label>Tanggal Selesai *</Label>
                  <DatePicker value={watch('end_date')} onChange={v => setValue('end_date', v)} className="mt-1.5" placeholder="Pilih Selesai" minDate={minEndDate} />
                </div>
              )}
            </div>

            <div>
              <Label>Dokumen Kontrak (PDF)</Label>
              <FileUpload bucket="attachments" path="contracts" value={docUrl} onChange={v => setValue('document_url', v)} accept={{ 'application/pdf': ['.pdf'] }} className="mt-1.5" label="Upload file PDF kontrak" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Hapus Kontrak?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data kontrak <strong>{(deleteTarget as any)?.profiles?.full_name || 'ini'}</strong> ({deleteTarget?.contract_number || 'tanpa nomor'}) akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Habisi Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  )
}
