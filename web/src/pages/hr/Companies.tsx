import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Building2, Edit, Trash2, MoreHorizontal } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AppShell } from '@/components/layout/AppShell'
import { DataTable } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import type { Company } from '@/types/database'

const companySchema = z.object({
  name: z.string().min(2, 'Nama perusahaan minimal 2 karakter'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  npwp: z.string().optional(),
  industry: z.string().optional(),
})
type CompanyForm = z.infer<typeof companySchema>

export function Companies() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null)

  const { data: companies, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('companies').select('*').order('name')
      if (error) throw error
      return data as Company[]
    },
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
  })

  const saveMutation = useMutation({
    mutationFn: async (values: CompanyForm) => {
      console.log('Inserting company:', values)
      if (editing) {
        const { error } = await supabase.from('companies').update(values).eq('id', editing.id)
        if (error) {
          console.error('Update error:', error)
          throw error
        }
      } else {
        const { error } = await supabase.from('companies').insert(values)
        if (error) {
          console.error('Insert error:', error)
          throw error
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      toast({ title: editing ? 'Perusahaan diperbarui' : 'Perusahaan ditambahkan', description: 'Data berhasil disimpan.' })
      setOpen(false)
      setEditing(null)
      reset()
    },
    onError: (err: any) => {
      console.error('Mutation error:', err)
      toast({ title: 'Gagal Menyimpan', description: err.message || 'Terjadi kesalahan sistem', variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('companies').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      toast({ title: 'Dihapus', description: 'Perusahaan berhasil dihapus.' })
      setDeleteTarget(null)
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  function openEdit(company: Company) {
    setEditing(company)
    reset({ name: company.name, address: company.address || '', phone: company.phone || '', email: company.email || '', npwp: company.npwp || '', industry: company.industry || '' })
    setOpen(true)
  }

  function openAdd() {
    setEditing(null)
    reset({ name: '', address: '', phone: '', email: '', npwp: '', industry: '' })
    setOpen(true)
  }

  const columns: ColumnDef<Company>[] = [
    {
      accessorKey: 'name',
      header: 'Nama Perusahaan',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">{row.original.name}</p>
            <p className="text-xs text-slate-400">{row.original.industry || '—'}</p>
          </div>
        </div>
      ),
    },
    { accessorKey: 'email', header: 'Email', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'phone', header: 'Telepon', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'npwp', header: 'NPWP', cell: ({ getValue }) => getValue() || '—' },
    {
      accessorKey: 'created_at',
      header: 'Terdaftar',
      cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString('id-ID', { dateStyle: 'medium' }),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={() => openEdit(row.original)} className="gap-2">
              <Edit className="h-3.5 w-3.5" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteTarget(row.original)} className="gap-2 text-red-600 focus:text-red-600">
              <Trash2 className="h-3.5 w-3.5" /> Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <AppShell>
      <PageHeader
        title="Manajemen Perusahaan"
        description="Kelola data perusahaan / PT dalam sistem"
        icon={Building2}
        breadcrumbs={[{ label: 'HR Portal' }, { label: 'Perusahaan' }]}
        actions={
          <Button onClick={openAdd} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Tambah PT
          </Button>
        }
      />

      <Card className="card-premium">
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={companies || []}
            loading={isLoading}
            searchPlaceholder="Cari perusahaan..."
            emptyMessage="Belum ada perusahaan terdaftar."
          />
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Perusahaan' : 'Tambah Perusahaan Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nama Perusahaan *</Label>
                <Input {...register('name')} className="mt-1.5" placeholder="PT. Contoh Indonesia" />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label>Industri</Label>
                <Input {...register('industry')} className="mt-1.5" placeholder="Teknologi, Manufaktur, dll" />
              </div>
              <div>
                <Label>No. Telepon</Label>
                <Input {...register('phone')} className="mt-1.5" placeholder="021-xxxx" />
              </div>
              <div>
                <Label>Email</Label>
                <Input {...register('email')} className="mt-1.5" type="email" placeholder="info@perusahaan.com" />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <Label>NPWP</Label>
                <Input {...register('npwp')} className="mt-1.5" placeholder="00.000.000.0-000.000" />
              </div>
              <div className="col-span-2">
                <Label>Alamat</Label>
                <Textarea {...register('address')} className="mt-1.5" rows={2} placeholder="Jl. Sudirman No. 1, Jakarta" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
                {isSubmitting ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Tambahkan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Hapus Perusahaan?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">Tindakan ini tidak dapat dibatalkan. Semua data yang terhubung dengan <strong>{deleteTarget?.name}</strong> akan terpengaruh.</p>
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
