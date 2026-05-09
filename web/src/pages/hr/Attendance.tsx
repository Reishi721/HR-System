import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Clock, Download, MapPin, Camera } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { DataTable } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { StatsCard } from '@/components/ui/StatsCard'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { exportAttendanceToExcel } from '@/lib/excel-export'
import type { Attendance } from '@/types/database'

export function AttendancePage() {
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [year, setYear] = useState(today.getFullYear())
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)

  const { data: attendances, isLoading } = useQuery({
    queryKey: ['attendances-hr', month, year],
    queryFn: async () => {
      const start = `${year}-${String(month).padStart(2, '0')}-01`
      const end = new Date(year, month, 0).toISOString().slice(0, 10)
      const { data } = await supabase
        .from('attendances')
        .select('*, profiles!inner(full_name, employee_id, avatar_url)')
        .gte('date', start).lte('date', end)
        .order('date', { ascending: false })
      return data as Attendance[]
    },
  })

  const stats = {
    present: attendances?.filter(a => a.status === 'present').length || 0,
    late: attendances?.filter(a => a.status === 'late').length || 0,
    absent: attendances?.filter(a => a.status === 'absent').length || 0,
    total: attendances?.length || 0,
  }

  const columns: ColumnDef<Attendance>[] = [
    {
      accessorKey: 'date',
      header: 'Tanggal',
      cell: ({ getValue }) => (
        <span className="font-medium text-slate-700">
          {new Date(getValue() as string).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
        </span>
      ),
    },
    {
      id: 'employee',
      header: 'Karyawan',
      cell: ({ row }) => {
        const profiles = (row.original as any).profiles
        return (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-300 to-violet-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {profiles?.full_name?.[0]}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">{profiles?.full_name}</p>
              <p className="text-xs text-slate-400">{profiles?.employee_id || '—'}</p>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'clock_in_time',
      header: 'Jam Masuk',
      cell: ({ row, getValue }) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">{getValue() ? new Date(getValue() as string).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
          {row.original.clock_in_photo && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedPhoto(row.original.clock_in_photo)} className="text-indigo-500 hover:text-indigo-700 h-7 w-7 p-0">
              <Camera className="h-3.5 w-3.5" />
            </Button>
          )}
          {row.original.clock_in_lat && (
            <a href={`https://maps.google.com/maps?q=${row.original.clock_in_lat},${row.original.clock_in_lng}`} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-700 transition-colors">
              <MapPin className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'clock_out_time',
      header: 'Jam Keluar',
      cell: ({ row, getValue }) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">{getValue() ? new Date(getValue() as string).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
          {row.original.clock_out_photo && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedPhoto(row.original.clock_out_photo)} className="text-indigo-500 hover:text-indigo-700 h-7 w-7 p-0">
              <Camera className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
    {
      id: 'duration',
      header: 'Durasi',
      cell: ({ row }) => {
        const { clock_in_time, clock_out_time } = row.original
        if (!clock_in_time || !clock_out_time) return <span className="text-slate-400">—</span>
        const diff = (new Date(clock_out_time).getTime() - new Date(clock_in_time).getTime()) / 1000 / 60
        const h = Math.floor(diff / 60); const m = Math.round(diff % 60)
        return <span className="font-mono text-sm text-slate-700">{h}j {m}m</span>
      },
    },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
  ]

  return (
    <AppShell>
      <PageHeader
        title="Kehadiran Karyawan"
        description="Monitor dan laporan data kehadiran seluruh karyawan"
        icon={Clock}
        breadcrumbs={[{ label: 'HR Portal' }, { label: 'Kehadiran' }]}
        actions={
          <Button
            variant="outline"
            onClick={() => exportAttendanceToExcel(attendances || [], month, year)}
            className="flex items-center gap-2 bg-white"
          >
            <Download className="h-4 w-4" /> Export Excel
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stagger">
        <StatsCard title="Total Rekaman" value={stats.total} icon={Clock} color="indigo" />
        <StatsCard title="Hadir" value={stats.present} icon={Clock} color="emerald" />
        <StatsCard title="Terlambat" value={stats.late} icon={Clock} color="amber" />
        <StatsCard title="Absen" value={stats.absent} icon={Clock} color="rose" />
      </div>

      {/* Filter */}
      <Card className="card-premium mb-6">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 font-medium">Filter Periode:</span>
            <Select value={month.toString()} onValueChange={v => setMonth(+v)}>
              <SelectTrigger className="w-[140px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i} value={(i + 1).toString()}>{new Date(2024, i, 1).toLocaleDateString('id-ID', { month: 'long' })}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={year.toString()} onValueChange={v => setYear(+v)}>
              <SelectTrigger className="w-[100px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2023, 2024, 2025, 2026].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="card-premium">
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={attendances || []}
            loading={isLoading}
            searchPlaceholder="Cari nama atau tanggal..."
            emptyMessage="Tidak ada data kehadiran untuk periode ini."
          />
        </CardContent>
      </Card>

      {/* Photo Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center">
          <DialogHeader className="hidden">
            <DialogTitle>Foto Kehadiran</DialogTitle>
          </DialogHeader>
          <div className="relative w-full">
            {selectedPhoto ? (
              <img src={selectedPhoto} alt="Selfie" className="w-full rounded-2xl shadow-2xl" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
