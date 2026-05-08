import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Briefcase, Edit, Trash2, MoreHorizontal, ChevronRight } from 'lucide-react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/payroll-calculator'
import type { Department, Position, Company } from '@/types/database'

const deptSchema = z.object({
  name: z.string().min(2, 'Minimal 2 karakter'),
  description: z.string().optional(),
  company_id: z.string().min(1, 'Pilih perusahaan'),
})

const posSchema = z.object({
  name: z.string().min(2, 'Minimal 2 karakter'),
  level: z.string().optional(),
  base_salary: z.coerce.number().min(0),
  department_id: z.string().min(1, 'Pilih departemen'),
})

type DeptForm = z.infer<typeof deptSchema>
type PosForm = z.infer<typeof posSchema>

export function Departments() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [deptOpen, setDeptOpen] = useState(false)
  const [posOpen, setPosOpen] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [editingPos, setEditingPos] = useState<Position | null>(null)
  const [selectedDept, setSelectedDept] = useState<Department | null>(null)

  const { data: companies } = useQuery({
    queryKey: ['companies', 'list'],
    queryFn: async () => { 
      const { data, error } = await supabase.from('companies').select('id, name')
      if (error) {
        console.error('Companies fetch error:', error)
        throw error
      }
      return data as Company[] 
    },
  })

  const { data: departments, isLoading: deptLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('*, companies(name)').order('name')
      return data as Department[]
    },
  })

  const { data: positions, isLoading: posLoading } = useQuery({
    queryKey: ['positions', selectedDept?.id],
    queryFn: async () => {
      let q = supabase.from('positions').select('*, departments(name)').order('name')
      if (selectedDept) q = q.eq('department_id', selectedDept.id)
      const { data } = await q
      return data as Position[]
    },
  })

  const deptForm = useForm<DeptForm>({ resolver: zodResolver(deptSchema) })
  const posForm = useForm<PosForm>({ resolver: zodResolver(posSchema) })

  const saveDept = useMutation({
    mutationFn: async (values: DeptForm) => {
      if (editingDept) {
        const { error } = await supabase.from('departments').update(values).eq('id', editingDept.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('departments').insert(values)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      toast({ title: 'Berhasil', description: 'Departemen disimpan.' })
      setDeptOpen(false); setEditingDept(null); deptForm.reset()
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const savePos = useMutation({
    mutationFn: async (values: PosForm) => {
      if (editingPos) {
        const { error } = await supabase.from('positions').update(values).eq('id', editingPos.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('positions').insert(values)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] })
      toast({ title: 'Berhasil', description: 'Jabatan disimpan.' })
      setPosOpen(false); setEditingPos(null); posForm.reset()
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const deleteDept = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('departments').delete().eq('id', id); if (error) throw error },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['departments'] }); toast({ title: 'Dihapus' }) },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const deletePos = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('positions').delete().eq('id', id); if (error) throw error },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['positions'] }); toast({ title: 'Dihapus' }) },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const deptColumns: ColumnDef<Department>[] = [
    {
      accessorKey: 'name',
      header: 'Nama Departemen',
      cell: ({ row }) => (
        <Button variant="link" onClick={() => setSelectedDept(row.original)} className="px-0 h-auto flex items-center gap-2 font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
          {row.original.name}
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      ),
    },
    { id: 'company', header: 'Perusahaan', cell: ({ row }) => (row.original as any).companies?.name || '—' },
    { accessorKey: 'description', header: 'Deskripsi', cell: ({ getValue }) => getValue() || '—' },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setEditingDept(row.original); deptForm.reset({ name: row.original.name, description: row.original.description || '', company_id: row.original.company_id }); setDeptOpen(true) }}>
              <Edit className="h-3.5 w-3.5 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={() => deleteDept.mutate(row.original.id)}>
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const posColumns: ColumnDef<Position>[] = [
    { accessorKey: 'name', header: 'Nama Jabatan', cell: ({ getValue }) => <span className="font-semibold text-slate-800">{getValue() as string}</span> },
    { id: 'dept', header: 'Departemen', cell: ({ row }) => (row.original as any).departments?.name || '—' },
    { accessorKey: 'level', header: 'Level', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'base_salary', header: 'Gaji Dasar', cell: ({ getValue }) => <span className="font-mono text-sm">{formatCurrency(getValue() as number)}</span> },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setEditingPos(row.original); posForm.reset({ name: row.original.name, level: row.original.level || '', base_salary: row.original.base_salary, department_id: row.original.department_id }); setPosOpen(true) }}>
              <Edit className="h-3.5 w-3.5 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={() => deletePos.mutate(row.original.id)}>
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <AppShell>
      <PageHeader
        title="Departemen & Jabatan"
        description="Kelola struktur organisasi perusahaan"
        icon={Briefcase}
        breadcrumbs={[{ label: 'HR Portal' }, { label: 'Departemen' }]}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Departments */}
        <Card className="card-premium">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold">Departemen</CardTitle>
            <Button size="sm" onClick={() => { setEditingDept(null); deptForm.reset(); setDeptOpen(true) }} className="gap-1.5 h-8 bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-3.5 w-3.5" /> Tambah
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable columns={deptColumns} data={departments || []} loading={deptLoading} searchPlaceholder="Cari departemen..." pageSize={8} />
          </CardContent>
        </Card>

        {/* Positions */}
        <Card className="card-premium">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base font-semibold">
                Jabatan {selectedDept && <span className="text-indigo-600">· {selectedDept.name}</span>}
              </CardTitle>
              {selectedDept && (
                <Button variant="link" onClick={() => setSelectedDept(null)} className="px-0 h-auto text-xs text-slate-400 hover:text-slate-600 mt-0.5 transition-colors font-normal">
                  Tampilkan semua
                </Button>
              )}
            </div>
            <Button size="sm" onClick={() => { setEditingPos(null); posForm.reset({ department_id: selectedDept?.id || '', base_salary: 0 }); setPosOpen(true) }} className="gap-1.5 h-8 bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-3.5 w-3.5" /> Tambah
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable columns={posColumns} data={positions || []} loading={posLoading} searchPlaceholder="Cari jabatan..." pageSize={8} />
          </CardContent>
        </Card>
      </div>

      {/* Dept Dialog */}
      <Dialog open={deptOpen} onOpenChange={setDeptOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingDept ? 'Edit Departemen' : 'Tambah Departemen'}</DialogTitle></DialogHeader>
          <form onSubmit={deptForm.handleSubmit(d => saveDept.mutate(d))} className="space-y-4 mt-2">
            <div>
              <Label>Perusahaan *</Label>
              <Select onValueChange={v => deptForm.setValue('company_id', v)} defaultValue={editingDept?.company_id}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih perusahaan" /></SelectTrigger>
                <SelectContent>{companies?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Nama Departemen *</Label><Input {...deptForm.register('name')} className="mt-1.5" /></div>
            <div><Label>Deskripsi</Label><Textarea {...deptForm.register('description')} className="mt-1.5" rows={2} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeptOpen(false)}>Batal</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pos Dialog */}
      <Dialog open={posOpen} onOpenChange={setPosOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingPos ? 'Edit Jabatan' : 'Tambah Jabatan'}</DialogTitle></DialogHeader>
          <form onSubmit={posForm.handleSubmit(d => savePos.mutate(d))} className="space-y-4 mt-2">
            <div>
              <Label>Departemen *</Label>
              <Select onValueChange={v => posForm.setValue('department_id', v)} defaultValue={editingPos?.department_id || selectedDept?.id}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pilih departemen" /></SelectTrigger>
                <SelectContent>{departments?.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Label>Nama Jabatan *</Label><Input {...posForm.register('name')} className="mt-1.5" /></div>
              <div>
                <Label>Level</Label>
                <Select onValueChange={v => posForm.setValue('level', v)} defaultValue={editingPos?.level || ''}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Level" /></SelectTrigger>
                  <SelectContent>
                    {['Junior', 'Senior', 'Lead', 'Manager', 'Director', 'VP', 'C-Level'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Gaji Dasar</Label><Input {...posForm.register('base_salary')} type="number" className="mt-1.5" /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPosOpen(false)}>Batal</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
