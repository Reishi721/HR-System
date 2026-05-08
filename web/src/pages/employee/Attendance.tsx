import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Camera, MapPin, MapPinned, PlayCircle, StopCircle, CheckSquare } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { DataTable } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import type { Attendance } from '@/types/database'

export function EmployeeAttendance() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const videoRef = useRef<HTMLVideoElement>(null)
  
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isLocating, setIsLocating] = useState(false)

  // Get current attendance status
  const today = new Date().toISOString().slice(0, 10)
  const { data: todayAttendance, isLoading: _todayLoading } = useQuery({
    queryKey: ['employee-today-attendance', profile?.id, today],
    queryFn: async () => {
      if (!profile?.id) return null
      const { data } = await supabase.from('attendances').select('*').eq('user_id', profile.id).eq('date', today).maybeSingle()
      return data as Attendance | null
    },
    enabled: !!profile?.id,
  })

  // Get history
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['employee-attendance-history', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data } = await supabase.from('attendances').select('*').eq('user_id', profile.id).order('date', { ascending: false }).limit(30)
      return data as Attendance[]
    },
    enabled: !!profile?.id,
  })

  // Start Camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err: any) {
      toast({ title: 'Gagal akses kamera', description: err.message, variant: 'destructive' })
    }
  }

  const stopCamera = () => {
    stream?.getTracks().forEach(track => track.stop())
    setStream(null)
  }

  // Effect to clean up camera strictly when unmounting
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stream])

  const takePhoto = () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    ctx?.drawImage(videoRef.current, 0, 0)
    setPhoto(canvas.toDataURL('image/jpeg', 0.8)) // medium quality
    stopCamera()
  }

  const getLocation = () => {
    setIsLocating(true)
    if (!navigator.geolocation) {
      toast({ title: 'GPS tidak didukung', variant: 'destructive' })
      setIsLocating(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setIsLocating(false)
      },
      (err) => {
        toast({ title: 'Gagal akses GPS', description: err.message, variant: 'destructive' })
        setIsLocating(false)
      },
      { enableHighAccuracy: true }
    )
  }

  const clockMutation = useMutation({
    mutationFn: async (type: 'in' | 'out') => {
      if (!profile?.id) throw new Error('Unauthenticated')
      if (!photo) throw new Error('Ambil foto selfie dulu')
      if (!location) throw new Error('Akses GPS wajib diaktifkan')

      // Upload photo
      const fileExt = 'jpeg'
      const fileName = `${profile.id}_${today}_${type}.${fileExt}`
      const base64Data = photo.replace(/^data:image\/\w+;base64,/, '')
      const blob = new Blob([Buffer.from(base64Data, 'base64')], { type: 'image/jpeg' })

      const { error: uploadErr } = await supabase.storage.from('attendances').upload(`${profile.id}/${fileName}`, blob, { upsert: true })
      if (uploadErr) throw uploadErr

      const { data: publicUrlData } = supabase.storage.from('attendances').getPublicUrl(`${profile.id}/${fileName}`)
      const photoUrl = publicUrlData.publicUrl

      const nowTime = new Date().toISOString()

      if (type === 'in') {
        const hour = new Date().getHours()
        const status = hour >= 9 ? 'late' : 'present' // Asumsi jam masuk batas < 09:00

        const { error } = await supabase.from('attendances').insert({
          user_id: profile.id,
          date: today,
          clock_in_time: nowTime,
          clock_in_lat: location.lat,
          clock_in_lng: location.lng,
          clock_in_photo: photoUrl,
          status,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.from('attendances').update({
          clock_out_time: nowTime,
          clock_out_lat: location.lat,
          clock_out_lng: location.lng,
          clock_out_photo: photoUrl,
        }).eq('id', todayAttendance!.id)
        if (error) throw error
      }
    },
    onSuccess: (_, type) => {
      queryClient.invalidateQueries({ queryKey: ['employee-today-attendance'] })
      queryClient.invalidateQueries({ queryKey: ['employee-attendance-history'] })
      toast({ title: `Berhasil Clock ${type === 'in' ? 'In' : 'Out'}`, description: 'Data kehadiran telah disimpan.' })
      setPhoto(null)
      setLocation(null)
    },
    onError: (err: any) => toast({ title: 'Gagal Absen', description: err.message, variant: 'destructive' }),
  })

  // Columns for history
  const columns: ColumnDef<Attendance>[] = [
    { accessorKey: 'date', header: 'Tanggal', cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) },
    { accessorKey: 'clock_in_time', header: 'Jam Masuk', cell: ({ getValue }) => getValue() ? new Date(getValue() as string).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' }) : '—' },
    { accessorKey: 'clock_out_time', header: 'Jam Keluar', cell: ({ getValue }) => getValue() ? new Date(getValue() as string).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' }) : '—' },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
  ]

  const hasClockedIn = !!todayAttendance?.clock_in_time
  const hasClockedOut = !!todayAttendance?.clock_out_time

  return (
    <AppShell>
      <PageHeader
        title="Absen Web"
        description="Fasilitas check-in/out melalui Web dengan deteksi Lokasi dan Selfie"
        icon={MapPinned}
        breadcrumbs={[{ label: 'Employee Space' }, { label: 'Kehadiran' }]}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Check In Panel */}
        <Card className="card-premium">
          <CardHeader className="pb-4 border-b border-slate-50">
            <CardTitle className="text-base font-semibold">Live Clock In/Out</CardTitle>
            <CardDescription>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            
            {hasClockedIn && hasClockedOut ? (
              <div className="py-12 text-center text-slate-500">
                <CheckSquare className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-slate-700">Anda sudah selesai bekerja hari ini!</h3>
                <p>Terima kasih dan selamat beristirahat.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Camera Area */}
                <div className="relative aspect-video bg-slate-100 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                  {photo ? (
                     <img src={photo} alt="Selfie" className="w-full h-full object-cover" />
                  ) : stream ? (
                     <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
                  ) : (
                    <div className="text-center text-slate-400">
                      <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium">Kamera belum aktif</p>
                    </div>
                  )}

                  {!photo && (
                    <Button 
                      className={`absolute bottom-4 left-1/2 -translate-x-1/2 ${stream ? 'bg-indigo-600' : 'bg-slate-800'}`}
                      onClick={stream ? takePhoto : startCamera}
                    >
                      {stream ? 'Ambil Selfie' : 'Aktifkan Kamera'}
                    </Button>
                  )}

                  {photo && (
                    <Button size="sm" variant="outline" className="absolute top-2 right-2 bg-white/50 backdrop-blur" onClick={() => setPhoto(null)}>
                      Ulangi
                    </Button>
                  )}
                </div>

                {/* Location Area */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${location ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Cek Lokasi GPS</p>
                      <p className="text-xs text-slate-500 font-mono">
                        {location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : 'Wajib diaktifkan'}
                      </p>
                    </div>
                  </div>
                  {!location && (
                    <Button size="sm" variant="outline" onClick={getLocation} disabled={isLocating}>
                      {isLocating ? 'Mencari...' : 'Dapatkan Lokasi'}
                    </Button>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  {!hasClockedIn ? (
                    <Button 
                      className="w-full gap-2 h-12 bg-indigo-600 hover:bg-indigo-700 text-base shadow-lg shadow-indigo-200"
                      disabled={!photo || !location || clockMutation.isPending}
                      onClick={() => clockMutation.mutate('in')}
                    >
                      <PlayCircle className="h-5 w-5" /> Clock In / Masuk
                    </Button>
                  ) : (
                    <Button 
                      className="w-full gap-2 h-12 bg-amber-500 hover:bg-amber-600 text-base shadow-lg shadow-amber-200 col-span-2"
                      disabled={!photo || !location || clockMutation.isPending}
                      onClick={() => clockMutation.mutate('out')}
                    >
                      <StopCircle className="h-5 w-5" /> Clock Out / Keluar
                    </Button>
                  )}
                </div>
                {(!photo || !location) && !hasClockedOut && (
                  <p className="text-xs text-center text-rose-500 font-medium animate-pulse">
                    * Harap ambil selfie dan dapatkan lokasi GPS terlebih dahulu.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status & History */}
        <div className="space-y-6">
          <Card className="card-premium">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Status Hari Ini</CardTitle>
            </CardHeader>
            <CardContent>
              {todayAttendance ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500">Masuk</span>
                    <span className="font-mono font-bold text-slate-800">{new Date(todayAttendance.clock_in_time!).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500">Keluar</span>
                    <span className="font-mono font-bold text-slate-800">{todayAttendance.clock_out_time ? new Date(todayAttendance.clock_out_time).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'}) : '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500">Status</span>
                    <StatusBadge status={todayAttendance.status} />
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-sm">
                  Belum ada data check-in hari ini.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="card-premium">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Riwayat Terakhir</CardTitle>
            </CardHeader>
            <CardContent className="h-64 overflow-hidden p-0 max-h-64 relative">
              <div className="absolute inset-0 overflow-y-auto px-6 pb-6 custom-scrollbar">
                <DataTable
                  columns={columns}
                  data={history || []}
                  loading={historyLoading}
                  searchPlaceholder="" // Hide toolbar by not interacting with it heavily
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
