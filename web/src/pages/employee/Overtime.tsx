import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Clock, Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AppShell } from '@/components/layout/AppShell'
import { DataTable } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/DatePicker'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import type { Overtime } from '@/types/database'

const otSchema = z.object({
  date: z.string().min(1, 'Tanggal wajib diisi'),
  start_time: z.string().min(1, 'Pilih waktu mulai'),
  end_time: z.string().min(1, 'Pilih waktu selesai'),
  reason: z.string().min(5, 'Berikan detail alasan lembur'),
})
type OTForm = z.infer<typeof otSchema>

export function OvertimeEmployee() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data: overtimes, isLoading } = useQuery({
    queryKey: ['employee-overtimes', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data } = await supabase.from('overtimes').select('*').eq('user_id', profile.id).order('created_at', { ascending: false })
      return data as Overtime[]
    },
    enabled: !!profile?.id,
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<OTForm>({
    resolver: zodResolver(otSchema),
  })

  const submitMutation = useMutation({
    mutationFn: async (values: OTForm) => {
      if (!profile?.id) throw new Error('Unauthenticated')
      
      // Calculate hours
      const s = new Date(`1970-01-01T${values.start_time}:00`)
      const e = new Date(`1970-01-01T${values.end_time}:00`)
      let diff = (e.getTime() - s.getTime()) / (1000 * 60 * 60)
      if (diff < 0) diff += 24 // crossing midnight
      const hours = Number(diff.toFixed(1))

      if (hours <= 0) throw new Error('Waktu lembur tidak valid')

      const { error } = await supabase.from('overtimes').insert({
        user_id: profile.id,
        date: values.date,
        start_time: values.start_time,
        end_time: values.end_time,
        hours,
        reason: values.reason,
        status: 'pending_manager' 
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-overtimes'] })
      toast({ title: 'Terkirim', description: 'Pengajuan lembur berhasil dikirim.' })
      setOpen(false)
      reset()
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const columns: ColumnDef<Overtime>[] = [
    { accessorKey: 'date', header: 'Tanggal', cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString('id-ID', { dateStyle: 'long' }) },
    { 
      id: 'time', 
      header: 'Waktu Lembur', 
      cell: ({ row }) => (
        <div>
          <span className="font-mono text-sm text-slate-800 font-semibold">{row.original.start_time} - {row.original.end_time}</span>
          <span className="text-xs text-slate-500 ml-2">({row.original.hours} Jam)</span>
        </div>
      ) 
    },
    { accessorKey: 'reason', header: 'Alasan Target Pekerjaan', cell: ({ getValue }) => <span className="text-sm line-clamp-2 w-64">{getValue() as string}</span> },
    { accessorKey: 'status', header: 'Status Approval', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
  ]

  return (
    <AppShell>
      <PageHeader
        title="Kerja Lembur (Overtime)"
        description="Ajukan kerja lembur di luar jam kerja reguler"
        icon={Clock}
        breadcrumbs={[{ label: 'Employee Space' }, { label: 'Lembur' }]}
        actions={
          <Button onClick={() => setOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Pengajuan Lembur
          </Button>
        }
      />

      <Card className="card-premium">
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={overtimes || []}
            loading={isLoading}
            searchPlaceholder="Cari berdasarkan alasan..."
            emptyMessage="Belum pernah melakukan kerja lembur."
          />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Form Pengajuan Lembur</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(d => submitMutation.mutate(d))} className="space-y-4 mt-2">
            <div>
              <Label>Tanggal Lembur *</Label>
              <DatePicker 
                value={watch('date')} 
                onChange={v => setValue('date', v)} 
                className="mt-1.5" 
                placeholder="Pilih Tanggal Lembur"
              />
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Jam Mulai *</Label><Input type="time" {...register('start_time')} className="mt-1.5" /></div>
              <div><Label>Jam Selesai *</Label><Input type="time" {...register('end_time')} className="mt-1.5" /></div>
            </div>

            <div>
              <Label>Uraian / Target Pekerjaan *</Label>
              <Textarea {...register('reason')} className="mt-1.5" rows={4} placeholder="Pekerjaan yang ingin diselesaikan..." />
              {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason.message}</p>}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
                {isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
