import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Users, Edit, Trash2, MoreHorizontal, Download, Eye } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AppShell } from '@/components/layout/AppShell'
import { DataTable } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { FileUpload } from '@/components/ui/FileUpload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/DatePicker'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { exportEmployeesToExcel } from '@/lib/excel-export'
import { formatCurrency } from '@/lib/payroll-calculator'
import type { Profile, Company, Department, Position } from '@/types/database'

const employeeSchema = z.object({
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  full_name: z.string().min(2, 'Nama minimal 2 karakter'),
  role: z.enum(['employee', 'manager', 'hr']),
  employee_id: z.string().optional(),
  nik: z.string().optional(),
  phone: z.string().optional(),
  hire_date: z.string().optional(),
  birth_date: z.string().optional(),
  gender: z.enum(['male', 'female']).optional(),
  address: z.string().optional(),
  company_id: z.string().optional(),
  department_id: z.string().optional(),
  position_id: z.string().optional(),
  manager_id: z.string().optional(),
  base_salary: z.coerce.number().min(0),
  meal_allowance: z.coerce.number().min(0),
  transport_allowance: z.coerce.number().min(0),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
  npwp: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  avatar_url: z.string().optional(),
})
type EmployeeForm = z.infer<typeof employeeSchema>

export function Employees() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Profile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active')

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees', statusFilter],
    queryFn: async () => {
      let q = supabase.from('profiles').select(`*, companies(name), departments(name), positions(name)`).order('full_name')
      if (statusFilter !== 'all') q = q.eq('status', statusFilter)
      const { data, error } = await q
      if (error) throw error
      return data as Profile[]
    },
  })

  const { data: companies } = useQuery({
    queryKey: ['companies-list'],
    queryFn: async () => { const { data } = await supabase.from('companies').select('id, name'); return data as Company[] },
  })
  const { data: departments } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => { const { data } = await supabase.from('departments').select('id, name'); return data as Department[] },
  })
  const { data: positions } = useQuery({
    queryKey: ['positions-list'],
    queryFn: async () => { const { data } = await supabase.from('positions').select('id, name'); return data as Position[] },
  })
  const { data: managers } = useQuery({
    queryKey: ['managers-list'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').in('role', ['manager', 'hr'])
      return data as Pick<Profile, 'id' | 'full_name'>[]
    },
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { role: 'employee', status: 'active', base_salary: 0, meal_allowance: 0, transport_allowance: 0 },
  })

  const avatarUrl = watch('avatar_url')

  const saveMutation = useMutation({
    mutationFn: async (values: EmployeeForm) => {
      // Destructure email out — it's only needed for creating the auth user,
      // not for updating the profiles table.
      const { email, ...profileData } = values

      // Sanitize empty strings to null for date/optional FK fields
      const sanitized = Object.fromEntries(
        Object.entries(profileData).map(([key, val]) => [
          key,
          val === '' && ['hire_date', 'birth_date', 'company_id', 'department_id', 'position_id', 'manager_id'].includes(key)
            ? null
            : val,
        ])
      )

      if (editing) {
        // ── UPDATE existing profile ──
        const { error } = await supabase.from('profiles').update(sanitized).eq('id', editing.id)
        if (error) throw error
      } else {
        // ── CREATE new employee ──
        if (!email) throw new Error('Email wajib diisi untuk membuat akun karyawan baru.')

        if (!supabaseAdmin) {
          throw new Error(
            'Service Role Key belum dikonfigurasi. ' +
            'Tambahkan VITE_SUPABASE_SERVICE_ROLE_KEY di file .env lalu restart dev server.'
          )
        }

        // 1. Create auth user (trigger on auth.users will auto-create profile row)
        const tempPassword = `HR-${crypto.randomUUID().slice(0, 8)}!`
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true, // auto-confirm so HR doesn't need to wait
          user_metadata: { full_name: values.full_name, role: values.role },
        })
        if (authError) throw authError
        if (!authData.user) throw new Error('Gagal membuat akun user.')

        // 2. Wait briefly for the DB trigger to create the profile row
        await new Promise(r => setTimeout(r, 800))

        // 3. Update the auto-created profile with all the additional fields
        const { error: profileError } = await supabase
          .from('profiles')
          .update(sanitized)
          .eq('id', authData.user.id)
        if (profileError) throw profileError
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast({ title: editing ? 'Data diperbarui' : 'Karyawan ditambahkan', description: editing ? 'Profil karyawan berhasil disimpan.' : 'Akun karyawan baru berhasil dibuat.' })
      setOpen(false); setEditing(null); reset()
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('profiles').update({ status: 'inactive' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast({ title: 'Dinonaktifkan', description: 'Karyawan berhasil dinonaktifkan.' })
      setDeleteTarget(null)
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  function openEdit(emp: Profile) {
    setEditing(emp)
    reset({
      full_name: emp.full_name, role: emp.role, employee_id: emp.employee_id || '',
      nik: emp.nik || '', phone: emp.phone || '', hire_date: emp.hire_date || '',
      birth_date: emp.birth_date || '', gender: emp.gender || undefined,
      address: emp.address || '', company_id: emp.company_id || '',
      department_id: emp.department_id || '', position_id: emp.position_id || '',
      manager_id: emp.manager_id || '', base_salary: emp.base_salary,
      meal_allowance: emp.meal_allowance, transport_allowance: emp.transport_allowance,
      bank_name: emp.bank_name || '', bank_account: emp.bank_account || '',
      npwp: emp.npwp || '', status: emp.status, avatar_url: emp.avatar_url || '',
    })
    setOpen(true)
  }

  const columns: ColumnDef<Profile>[] = [
    {
      accessorKey: 'full_name',
      header: 'Karyawan',
      cell: ({ row }) => {
        const emp = row.original
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={emp.avatar_url} alt={emp.full_name} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-violet-500 text-white text-sm font-bold">
                {emp.full_name[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-slate-800">{emp.full_name}</p>
              <p className="text-xs text-slate-400">{emp.employee_id || '—'}</p>
            </div>
          </div>
        )
      },
    },
    { accessorKey: 'role', header: 'Role', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
    {
      id: 'department',
      header: 'Departemen',
      cell: ({ row }) => <span className="text-sm">{(row.original as any).departments?.name || '—'}</span>,
    },
    {
      id: 'position',
      header: 'Jabatan',
      cell: ({ row }) => <span className="text-sm">{(row.original as any).positions?.name || '—'}</span>,
    },
    { accessorKey: 'phone', header: 'No. HP', cell: ({ getValue }) => getValue() || '—' },
    {
      accessorKey: 'base_salary',
      header: 'Gaji Pokok',
      cell: ({ getValue }) => <span className="font-mono text-sm">{formatCurrency(getValue() as number)}</span>,
    },
    { accessorKey: 'hire_date', header: 'Tgl. Masuk', cell: ({ getValue }) => getValue() ? new Date(getValue() as string).toLocaleDateString('id-ID') : '—' },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
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
              <Edit className="h-3.5 w-3.5" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-red-600 focus:text-red-600" onClick={() => setDeleteTarget(row.original)}>
              <Trash2 className="h-3.5 w-3.5" /> Nonaktifkan
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <AppShell>
      <PageHeader
        title="Manajemen Karyawan"
        description="Kelola data, profil, dan informasi seluruh karyawan"
        icon={Users}
        breadcrumbs={[{ label: 'HR Portal' }, { label: 'Karyawan' }]}
        actions={
          <div className="flex gap-2">
            <Button onClick={() => exportEmployeesToExcel(employees || [])} variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Export Excel
            </Button>
            <Button onClick={() => { setEditing(null); reset({ role: 'employee', status: 'active', base_salary: 0, meal_allowance: 0, transport_allowance: 0, email: '' }); setOpen(true) }} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> Tambah Karyawan
            </Button>
          </div>
        }
      />

      <Card className="card-premium">
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={employees || []}
            loading={isLoading}
            searchPlaceholder="Cari nama, ID, atau jabatan..."
            onExport={() => exportEmployeesToExcel(employees || [])}
            toolbar={
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                {(['all', 'active', 'inactive'] as const).map(s => (
                  <Button key={s} variant="ghost" size="sm" onClick={() => setStatusFilter(s)}
                    className={statusFilter === s ? 'bg-white text-slate-800 shadow-sm hover:bg-white' : 'text-slate-500 hover:text-slate-700'}>
                    {s === 'all' ? 'Semua' : s === 'active' ? 'Aktif' : 'Tidak Aktif'}
                  </Button>
                ))}
              </div>
            }
          />
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit: ${editing.full_name}` : 'Tambah Karyawan'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="space-y-6 mt-2">
            {/* Avatar */}
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <Avatar className="h-20 w-20 rounded-2xl border-2 border-slate-100">
                  <AvatarImage src={avatarUrl} alt="Avatar" className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-violet-500 text-white text-2xl font-bold rounded-2xl">
                    {watch('full_name')?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1">
                <Label className="mb-1.5 block">Foto Profil</Label>
                <FileUpload bucket="avatars" path="employees" value={avatarUrl} onChange={url => setValue('avatar_url', url)} label="Upload foto karyawan" />
              </div>
            </div>

            {/* Email — only for create mode */}
            {!editing && (
              <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100">
                <h3 className="text-sm font-semibold text-indigo-700 uppercase tracking-wider mb-3">Akun Login Karyawan</h3>
                <div>
                  <Label>Email Login *</Label>
                  <Input {...register('email')} type="email" className="mt-1.5 bg-white" placeholder="karyawan@perusahaan.com" />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                  <p className="text-xs text-indigo-500 mt-1.5">Sistem akan membuat akun otomatis dengan password sementara (auto-generated).</p>
                </div>
              </div>
            )}

            {/* Data Pribadi */}
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Data Pribadi</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label>Nama Lengkap *</Label>
                  <Input {...register('full_name')} className="mt-1.5" />
                  {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name.message}</p>}
                </div>
                <div><Label>ID Karyawan</Label><Input {...register('employee_id')} className="mt-1.5" placeholder="EMP-001" /></div>
                <div><Label>NIK KTP</Label><Input {...register('nik')} className="mt-1.5" /></div>
                <div><Label>No. HP</Label><Input {...register('phone')} className="mt-1.5" /></div>
                <div>
                  <Label>Jenis Kelamin</Label>
                  <Select onValueChange={(v) => setValue('gender', v as any)} defaultValue={editing?.gender || ''}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Laki-laki</SelectItem>
                      <SelectItem value="female">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tanggal Lahir</Label>
                  <DatePicker value={watch('birth_date')} onChange={v => setValue('birth_date', v)} className="mt-1.5" placeholder="Pilih Lahir" fromYear={1940} toYear={new Date().getFullYear()} />
                </div>
                <div>
                  <Label>Tanggal Masuk</Label>
                  <DatePicker value={watch('hire_date')} onChange={v => setValue('hire_date', v)} className="mt-1.5" placeholder="Pilih Masuk" fromYear={2000} toYear={new Date().getFullYear() + 1} />
                </div>
                <div className="sm:col-span-2"><Label>Alamat</Label><Textarea {...register('address')} className="mt-1.5" rows={2} /></div>
              </div>
            </div>

            {/* Pekerjaan */}
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Informasi Pekerjaan</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Role</Label>
                  <Select onValueChange={(v) => setValue('role', v as any)} defaultValue={editing?.role || 'employee'}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="hr">HR Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select onValueChange={(v) => setValue('status', v as any)} defaultValue={editing?.status || 'active'}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="inactive">Tidak Aktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Perusahaan</Label>
                  <Select onValueChange={(v) => setValue('company_id', v)} defaultValue={editing?.company_id || ''}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih perusahaan" /></SelectTrigger>
                    <SelectContent>{companies?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Departemen</Label>
                  <Select onValueChange={(v) => setValue('department_id', v)} defaultValue={editing?.department_id || ''}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih departemen" /></SelectTrigger>
                    <SelectContent>{departments?.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Jabatan</Label>
                  <Select onValueChange={(v) => setValue('position_id', v)} defaultValue={editing?.position_id || ''}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih jabatan" /></SelectTrigger>
                    <SelectContent>{positions?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Manager / Atasan</Label>
                  <Select onValueChange={(v) => setValue('manager_id', v)} defaultValue={editing?.manager_id || ''}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih manager" /></SelectTrigger>
                    <SelectContent>{managers?.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Gaji */}
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Informasi Gaji</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div><Label>Gaji Pokok</Label><Input {...register('base_salary')} type="number" className="mt-1.5" /></div>
                <div><Label>Tunjangan Makan</Label><Input {...register('meal_allowance')} type="number" className="mt-1.5" /></div>
                <div><Label>Tunjangan Transport</Label><Input {...register('transport_allowance')} type="number" className="mt-1.5" /></div>
                <div><Label>Bank</Label><Input {...register('bank_name')} className="mt-1.5" placeholder="BCA, Mandiri, dll" /></div>
                <div><Label>No. Rekening</Label><Input {...register('bank_account')} className="mt-1.5" /></div>
                <div><Label>NPWP</Label><Input {...register('npwp')} className="mt-1.5" /></div>
              </div>
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto">
                {isSubmitting ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Buat Karyawan Baru'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">Batal</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-600">Nonaktifkan Karyawan?</AlertDialogTitle>
            <AlertDialogDescription>
              Status karyawan <strong>{deleteTarget?.full_name}</strong> akan diubah menjadi tidak aktif. Data tidak dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-amber-500 hover:bg-amber-600"
            >
              Nonaktifkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  )
}
