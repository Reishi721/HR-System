import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Receipt, Plus, ImageIcon, FileText } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AppShell } from '@/components/layout/AppShell'
import { DataTable } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { FileUpload } from '@/components/ui/FileUpload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/DatePicker'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/payroll-calculator'
import type { Reimbursement } from '@/types/database'

const klaimSchema = z.object({
  category: z.enum(['medical', 'transport', 'meals', 'business', 'other']),
  amount: z.coerce.number().min(1000, 'Minimal Rp 1.000'),
  description: z.string().min(5, 'Berikan detail keterangan'),
  receipt_date: z.string().min(1, 'Tanggal struk/nota wajib diisi'),
  attachment_url: z.string().min(1, 'Wajib melampirkan foto/file bukti'),
})
type KlaimForm = z.infer<typeof klaimSchema>

export function ReimbursementEmployee() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const { data: reimbursements, isLoading } = useQuery({
    queryKey: ['employee-reimbursements', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data } = await supabase.from('reimbursements').select('*').eq('user_id', profile.id).order('created_at', { ascending: false })
      return data as Reimbursement[]
    },
    enabled: !!profile?.id,
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<KlaimForm>({
    resolver: zodResolver(klaimSchema) as any,
    defaultValues: { category: 'transport' }
  })
  const attachmentUrl = watch('attachment_url')

  const submitMutation = useMutation({
    mutationFn: async (values: KlaimForm) => {
      if (!profile?.id) throw new Error('Unauthenticated')
      const { error } = await supabase.from('reimbursements').insert({
        user_id: profile.id,
        category: values.category,
        amount: values.amount,
        description: values.description,
        receipt_date: values.receipt_date,
        attachment_url: values.attachment_url,
        status: 'pending' // Usually direct to HR/Finance approval
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-reimbursements'] })
      toast({ title: 'Terkirim', description: 'Klaim reimbursement berhasil diajukan.' })
      setOpen(false)
      reset()
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const columns: ColumnDef<Reimbursement>[] = [
    { accessorKey: 'receipt_date', header: 'Tgl Struk', cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString('id-ID') },
    { accessorKey: 'category', header: 'Kategori', cell: ({ getValue }) => <span className="capitalize text-sm font-medium text-slate-700">{getValue() as string}</span> },
    { accessorKey: 'amount', header: 'Nominal', cell: ({ getValue }) => <span className="font-mono font-semibold text-slate-800">{formatCurrency(getValue() as number)}</span> },
    { accessorKey: 'description', header: 'Keterangan', cell: ({ getValue }) => <span className="text-sm text-slate-600 line-clamp-1">{getValue() as string}</span> },
    { 
      accessorKey: 'attachment_url', 
      header: 'Bukti', 
      cell: ({ getValue }) => {
        const url = getValue() as string
        if (!url) return <span className="text-slate-400">—</span>
        return (
          <Button variant="ghost" size="sm" onClick={() => setSelectedImage(url)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 h-7 px-2">
            {url.match(/\.(jpg|jpeg|png)$/i) ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
            Lihat
          </Button>
        )
      } 
    },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
  ]

  return (
    <AppShell>
      <PageHeader
        title="Klaim / Reimbursement"
        description="Ajukan penggantian dana untuk operasional perusahaan"
        icon={Receipt}
        breadcrumbs={[{ label: 'Employee Space' }, { label: 'Reimbursement' }]}
        actions={
          <Button onClick={() => setOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Ajukan Klaim Baru
          </Button>
        }
      />

      <Card className="card-premium">
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={reimbursements || []}
            loading={isLoading}
            searchPlaceholder="Cari keterangan..."
            emptyMessage="Belum pernah mengajukan reimbursement."
          />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Form Klaim Reimbursement</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(d => submitMutation.mutate(d as unknown as KlaimForm))} className="space-y-4 mt-2">
            <div>
              <Label>Kategori Klaim *</Label>
              <Select onValueChange={v => setValue('category', v as any)} defaultValue="transport">
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="transport">Transportasi / Bensin</SelectItem>
                  <SelectItem value="medical">Kesehatan / Medis</SelectItem>
                  <SelectItem value="meals">Konsumsi / Makan</SelectItem>
                  <SelectItem value="business">Keperluan Bisnis / Kantor</SelectItem>
                  <SelectItem value="other">Lain-lain</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tanggal Struk / Nota *</Label>
                <DatePicker 
                  value={watch('receipt_date')} 
                  onChange={v => setValue('receipt_date', v)} 
                  className="mt-1.5" 
                  placeholder="Pilih Tanggal Struk"
                />
                {errors.receipt_date && <p className="text-xs text-red-500 mt-1">{errors.receipt_date.message}</p>}
              </div>
              <div>
                <Label>Nominal Klaim (Rp) *</Label>
                <Input type="number" {...register('amount')} className="mt-1.5" placeholder="150000" />
                {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
              </div>
            </div>

            <div>
              <Label>Uraian / Keterangan Kebutuhan *</Label>
              <Textarea {...register('description')} className="mt-1.5" rows={3} placeholder="Contoh: Bensin proyek lapangan..." />
              {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
            </div>

            <div>
              <Label>Upload Bukti Struk / Nota Asli *</Label>
              <FileUpload bucket="attachments" path="reimbursements" value={attachmentUrl || ''} onChange={v => setValue('attachment_url', v)} label="Upload Foto / PDF Struk" className="mt-1.5" />
              {errors.attachment_url && <p className="text-xs text-red-500 mt-1">{errors.attachment_url.message}</p>}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
                {isSubmitting ? 'Mengirim...' : 'Kirim Klaim'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Attachment Modal */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-none shadow-none flex items-center justify-center">
          <DialogHeader className="hidden">
            <DialogTitle>Bukti Klaim</DialogTitle>
          </DialogHeader>
          <div className="relative w-full flex justify-center">
            {selectedImage?.match(/\.pdf$/i) ? (
              <iframe src={selectedImage} className="w-full h-[80vh] bg-white rounded-lg" />
            ) : selectedImage ? (
              <img src={selectedImage} alt="Bukti" className="max-w-full max-h-[90vh] rounded-lg object-contain shadow-2xl" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
