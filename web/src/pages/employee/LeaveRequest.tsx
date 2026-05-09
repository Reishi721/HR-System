import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Calendar, Plus, MapPin } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { AppShell } from '@/components/layout/AppShell'
import { DataTable } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { StatsCard } from '@/components/ui/StatsCard'
import { FileUpload } from '@/components/ui/FileUpload'
import { DateRangePicker } from '@/components/ui/DateRangePicker'
import { Button } from '@/components/ui/button'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import type { LeaveRequest } from '@/types/database'

const leaveSchema = z.object({
  type: z.enum(['cuti', 'sakit', 'izin']),
  start_date: z.string().min(1, 'Tanggal mulai wajib diisi'),
  end_date: z.string().min(1, 'Tanggal selesai wajib diisi'),
  reason: z.string().min(5, 'Berikan alasan minimal 5 karakter'),
  attachment_url: z.string().optional(),
})
type LeaveForm = z.infer<typeof leaveSchema>

export function LeaveRequestEmployee() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)

  const { data: balance } = useQuery({
    queryKey: ['employee-leave-balance', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null
      const year = new Date().getFullYear()
      const { data } = await supabase.from('leave_balances').select('*').eq('user_id', profile.id).eq('year', year).maybeSingle()
      return data || { total_allocated: 12, total_used: 0 }
    },
    enabled: !!profile?.id,
  })

  const { data: requests, isLoading } = useQuery({
    queryKey: ['employee-leave-requests', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data } = await supabase.from('leave_requests').select('*').eq('user_id', profile.id).order('created_at', { ascending: false })
      return data as LeaveRequest[]
    },
    enabled: !!profile?.id,
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<LeaveForm>({
    resolver: zodResolver(leaveSchema) as any,
    defaultValues: { type: 'cuti' }
  })
  const leaveType = watch('type')
  const attachment = watch('attachment_url')

  const getLocation = () => {
    if (!navigator.geolocation) return toast({ title: 'GPS tidak didukung', variant: 'destructive' })
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => toast({ title: 'Gagal akses GPS', description: err.message, variant: 'destructive' })
    )
  }

  const submitMutation = useMutation({
    mutationFn: async (values: LeaveForm) => {
      if (!profile?.id) throw new Error('Unauthenticated')
      // Requirement: sakit or mendadak requires GPS
      if (values.type === 'sakit' && !location) throw new Error('Cuti sakit wajib menyertakan lokasi GPS (klik Dapatkan Lokasi GPS).')
      if (values.type === 'sakit' && !values.attachment_url) throw new Error('Cuti sakit wajib menyertakan surat keterangan dokter (file/foto).')

      const { error } = await supabase.from('leave_requests').insert({
        user_id: profile.id,
        type: values.type,
        start_date: values.start_date,
        end_date: values.end_date,
        reason: values.reason,
        attachment_url: values.attachment_url || null,
        location_lat: location?.lat,
        location_lng: location?.lng,
        status: 'pending_manager' // Manager -> HR workflow
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-leave-requests'] })
      toast({ title: 'Terkirim', description: 'Pengajuan cuti berhasil dikirim ke Manager.' })
      setOpen(false)
      reset()
      setLocation(null)
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const columns: ColumnDef<LeaveRequest>[] = [
    { accessorKey: 'type', header: 'Jenis', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
    { 
      id: 'period', 
      header: 'Periode Cuti', 
      cell: ({ row }) => <span className="font-medium text-sm text-slate-700">{new Date(row.original.start_date).toLocaleDateString('id-ID')} - {new Date(row.original.end_date).toLocaleDateString('id-ID')}</span> 
    },
    { accessorKey: 'reason', header: 'Alasan', cell: ({ getValue }) => <span className="text-sm line-clamp-1">{getValue() as string}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
  ]

  return (
    <AppShell>
      <PageHeader
        title="Pengajuan Cuti / Izin"
        description="Ajukan cuti tahunan, izin, atau pemberitahuan sakit"
        icon={Calendar}
        breadcrumbs={[{ label: 'Employee Space' }, { label: 'Cuti / Izin' }]}
        actions={
          <Button onClick={() => setOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Ajukan Cuti Baru
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stagger">
        <StatsCard title="Sisa Saldo Cuti" value={(balance?.total_allocated || 0) - (balance?.total_used || 0)} icon={Calendar} color="emerald" description={`Dari total ${balance?.total_allocated} hari`} />
        <StatsCard title="Cuti Digunakan" value={balance?.total_used || 0} icon={Calendar} color="amber" />
        <StatsCard title="Menunggu Approval" value={requests?.filter(r => r.status.includes('pending')).length || 0} icon={Calendar} color="indigo" />
      </div>

      <Card className="card-premium">
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={requests || []}
            loading={isLoading}
            searchPlaceholder="Cari alasan cuti..."
            emptyMessage="Belum ada riwayat pengajuan cuti."
          />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Form Pengajuan Cuti</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(d => submitMutation.mutate(d as unknown as LeaveForm))} className="space-y-4 mt-2">
            <div>
              <Label>Jenis Pengajuan *</Label>
              <Select onValueChange={v => setValue('type', v as any)} defaultValue={leaveType}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cuti">Cuti Tahunan</SelectItem>
                  <SelectItem value="sakit">Sakit</SelectItem>
                  <SelectItem value="izin">Izin Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Periode Cuti / Izin *</Label>
              <DateRangePicker 
                date={{ 
                  from: watch('start_date') ? new Date(watch('start_date')) : undefined,
                  to: watch('end_date') ? new Date(watch('end_date')) : undefined 
                }}
                onDateChange={(range) => {
                  if (range?.from) {
                    setValue('start_date', format(range.from, 'yyyy-MM-dd'), { shouldValidate: true })
                  } else {
                    setValue('start_date', '')
                  }
                  
                  if (range?.to) {
                    setValue('end_date', format(range.to, 'yyyy-MM-dd'), { shouldValidate: true })
                  } else {
                    // Jika hanya satu tanggal yang dipilih, otomatis jadikan end_date sama dengan start_date
                    if (range?.from) {
                      setValue('end_date', format(range.from, 'yyyy-MM-dd'), { shouldValidate: true })
                    } else {
                      setValue('end_date', '')
                    }
                  }
                }}
              />
              {(errors.start_date || errors.end_date) && <p className="text-xs text-red-500 mt-1">Periode cuti wajib diisi lengkap.</p>}
            </div>

            <div>
              <Label>Alasan Keterangan *</Label>
              <Textarea {...register('reason')} className="mt-1.5" rows={3} placeholder="Berikan detail alasan..." />
              {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason.message}</p>}
            </div>

            {(leaveType === 'sakit' || leaveType === 'izin') && (
              <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-700">Lampiran Keterangan {leaveType === 'sakit' ? '(Surat Dokter)' : ''}</Label>
                </div>
                <FileUpload bucket="attachments" path="leaves" value={attachment || ''} onChange={v => setValue('attachment_url', v)} label="Upload Bukti / Foto" />
                
                {leaveType === 'sakit' && (
                  <div className="flex items-center justify-between pt-2 border-t border-indigo-100">
                    <div>
                      <Label className="text-slate-700">Lokasi GPS Saat Ini</Label>
                      {location ? (
                        <p className="text-xs text-emerald-600 font-medium">Bujur: {location.lat.toFixed(4)}, Lintang: {location.lng.toFixed(4)}</p>
                      ) : (
                        <p className="text-xs text-amber-600 font-medium">Wajib untuk izin sakit mendadak</p>
                      )}
                    </div>
                    <Button type="button" size="sm" variant={location ? 'outline' : 'secondary'} onClick={getLocation}>
                      <MapPin className="h-4 w-4 mr-1.5" /> {location ? 'Perbarui Lokasi' : 'Dapatkan Lokasi GPS'}
                    </Button>
                  </div>
                )}
              </div>
            )}

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
