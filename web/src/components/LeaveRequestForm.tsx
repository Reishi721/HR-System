import { useState } from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, UploadCloud } from 'lucide-react'
import { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/input' // wait, text-area is not installed. We'll use Input or div
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

export function LeaveRequestForm({ userId }: { userId?: string }) {
  const [date, setDate] = useState<DateRange | undefined>()
  const [leaveType, setLeaveType] = useState<string>('')
  const [reason, setReason] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date?.from || !date?.to || !leaveType) {
      toast({
        title: "Validasi Gagal",
        description: "Harap isi jenis cuti dan rentang tanggal.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      // Simulate Geolocation
      const lat = -6.2088
      const lng = 106.8456

      let attachmentUrl = null
      if (file) {
        // Upload logic would go here
        attachmentUrl = `uploads/${Date.now()}_${file.name}`
      }

      const { error } = await supabase.from('leave_requests').insert({
        user_id: userId || 'some-user-uuid',
        type: leaveType,
        start_date: date.from.toISOString().split('T')[0],
        end_date: date.to.toISOString().split('T')[0],
        reason,
        location_lat: lat,
        location_lng: lng,
        attachment_url: attachmentUrl
      })

      if (error) throw error

      toast({
        title: "Pengajuan Terkirim!",
        description: "Surat permintaan cuti/sakit berhasil masuk ke sistem.",
      })
      
      // Reset form
      setDate(undefined)
      setLeaveType('')
      setReason('')
      setFile(null)

    } catch (err: any) {
      toast({
        title: "Terjadi Kesalahan",
        description: err.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Leave Type */}
        <div className="space-y-2">
          <Label>Jenis Pengajuan</Label>
          <Select value={leaveType} onValueChange={setLeaveType}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih Jenis Cuti" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cuti_tahunan">Cuti Tahunan (Memotong Saldo)</SelectItem>
              <SelectItem value="cuti_menikah">Cuti Menikah (Khusus)</SelectItem>
              <SelectItem value="sakit_dengan_surat">Sakit (Dengan Surat Dokter)</SelectItem>
              <SelectItem value="izin">Izin Lainnya</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Picker */}
        <div className="space-y-2 flex flex-col">
          <Label>Tanggal Pelaksanaan</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} -{" "}
                      {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pilih Tanggal Berlaku</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Alasan Keterangan</Label>
        <Input 
          placeholder="Isi rincian pengajuan..." 
          value={reason} 
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      {/* File Upload Drag & Drop */}
      {(leaveType === 'sakit_dengan_surat' || leaveType === 'cuti_menikah') && (
        <div className="space-y-2">
          <Label>Lampiran Dokumen Tambahan (Opsional)</Label>
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 transition"
          >
            <UploadCloud className="h-10 w-10 text-slate-400 mb-2" />
            <p className="text-sm font-medium">Tarik & Lepas File ke Sini</p>
            <p className="text-xs mt-1 mb-4">Atau klik untuk memilih (Format JPG, PNG, PDF)</p>
            <Input type="file" className="max-w-xs cursor-pointer" onChange={handleFileChange} />
            {file && (
              <p className="mt-4 text-sm text-blue-600 font-semibold border p-2 bg-blue-50 rounded">
                File Terpilih: {file.name}
              </p>
            )}
          </div>
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full md:w-auto">
        {loading ? 'Memproses...' : 'Kirim Pengajuan'}
      </Button>
    </form>
  )
}
