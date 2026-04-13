import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Home, FileText, LogOut, FileBadge } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LeaveRequestForm } from '@/components/LeaveRequestForm'

export function EmployeeDashboard() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="h-16 flex items-center px-6 border-b font-bold text-lg text-blue-700">
          Karyawan Portal
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/employee">
            <Button variant="ghost" className="w-full justify-start">
              <Home className="mr-2 h-4 w-4" />
              Beranda
            </Button>
          </Link>
          <Link to="/employee/pengajuan">
            <Button variant="ghost" className="w-full justify-start">
              <FileText className="mr-2 h-4 w-4" />
              Ajukan Cuti / Sakit
            </Button>
          </Link>
        </nav>
        <div className="p-4 border-t">
          <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Keluar
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/pengajuan" element={<RequestLeaveView />} />
        </Routes>
      </main>
    </div>
  )
}

function HomeView() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Beranda</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sisa Kuota Cuti
            </CardTitle>
            <FileBadge className="h-4 w-4 text-muted-foreground text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">12 <span className="text-lg font-normal text-slate-500">hari</span></div>
            <p className="text-xs text-slate-500 mt-2">
              Tahun 2026
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Pengajuan</CardTitle>
          <CardDescription>Semua riwayat pengajuan cuti dan sakit Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jenis</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Alasan</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Dummy data for now. We will fetch from supabase later. */}
              <TableRow>
                <TableCell>Sakit</TableCell>
                <TableCell>10 Apr - 11 Apr 2026</TableCell>
                <TableCell>Demam</TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800">
                    Disetujui
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function RequestLeaveView() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Pengajuan Cuti / Sakit</h1>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Form Pengajuan</CardTitle>
          <CardDescription>Lengkapi data di bawah ini untuk mengajukan cuti, sakit, atau izin.</CardDescription>
        </CardHeader>
        <CardContent>
          <LeaveRequestForm userId="user-uuid-123" />
        </CardContent>
      </Card>
    </div>
  )
}
