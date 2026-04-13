import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LogOut, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

export function ManagerDashboard() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [rejectReason, setRejectReason] = useState('')

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleApprove = () => {
    toast({
      title: "Disetujui",
      description: "Pengajuan berhasil diteruskan ke HR.",
    })
  }

  const handleReject = () => {
    if (!rejectReason) {
      toast({
        title: "Perhatian",
        description: "Harap masukkan alasan penolakan terlebih dahulu.",
        variant: "destructive"
      })
      return
    }
    toast({
      title: "Ditolak",
      description: `Pengajuan ditolak dengan alasan: ${rejectReason}`,
    })
    setRejectReason('')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="h-16 bg-white border-b flex items-center justify-between px-6">
        <div className="font-bold text-lg text-slate-800">
          Manager Portal
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={handleLogout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
            <LogOut className="mr-2 h-4 w-4" /> Keluar
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 space-y-6 max-w-7xl mx-auto w-full">
        <h1 className="text-3xl font-bold tracking-tight">Persetujuan Cuti Tim</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Menunggu Persetujuan</CardTitle>
            <CardDescription>Daftar pengajuan cuti/sakit dari karyawan yang berada di bawah wewenang Anda.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Karyawan</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Dummy Data */}
                <TableRow>
                  <TableCell className="font-medium">Budi Santoso</TableCell>
                  <TableCell>Cuti Tahunan</TableCell>
                  <TableCell>20 Apr - 22 Apr 2026</TableCell>
                  <TableCell>Acara Keluarga</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50" onClick={handleApprove}>
                      <CheckCircle className="mr-1 h-3 w-3" /> Approve
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50">
                          <XCircle className="mr-1 h-3 w-3" /> Reject
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Tolak Pengajuan Cuti?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tindakan ini tidak bisa dibatalkan. Karyawan akan menerima email notifikasi atas penolakan ini.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-2 py-4">
                          <Label htmlFor="rejectReason">Alasan Penolakan (Wajib)</Label>
                          <Input 
                            id="rejectReason" 
                            placeholder="Alasan..." 
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                          />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setRejectReason('')}>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={handleReject} className="bg-red-600 hover:bg-red-700">Submit Tolakan</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
