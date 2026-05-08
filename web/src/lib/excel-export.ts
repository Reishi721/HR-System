import * as XLSX from 'xlsx'
import { formatCurrency } from './payroll-calculator'
import type { Payslip, Profile, Attendance } from '@/types/database'

// ================================================================
// Excel Export Utilities
// ================================================================

export function exportPayrollToExcel(payslips: (Payslip & { profiles?: Profile })[]) {
  const rows = payslips.map(p => ({
    'ID Karyawan': p.profiles?.employee_id || '-',
    'Nama Karyawan': p.profiles?.full_name || '-',
    'Periode': `${p.year}/${String(p.month).padStart(2, '0')}`,
    'Gaji Pokok': p.base_salary,
    'Gaji Kotor': p.gross_salary,
    'Lembur': p.overtime_pay,
    'BPJS Kes. Karyawan': p.bpjs_kesehatan_employee,
    'BPJS JHT Karyawan': p.bpjs_jht_employee,
    'BPJS JP Karyawan': p.bpjs_jp_employee,
    'PPh 21': p.pph21,
    'Cicilan Pinjaman': p.loan_deduction,
    'Total Potongan': p.total_deductions,
    'Gaji Bersih': p.net_salary,
    'Bank': p.profiles?.bank_name || '-',
    'No. Rekening': p.profiles?.bank_account || '-',
    'Status': p.status,
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  
  // Auto column width
  const colWidths = Object.keys(rows[0] || {}).map(k => ({ wch: Math.max(k.length, 15) }))
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Payroll')
  XLSX.writeFile(wb, `payroll_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export function exportEmployeesToExcel(employees: Profile[]) {
  const rows = employees.map(e => ({
    'ID Karyawan': e.employee_id || '-',
    'Nama': e.full_name,
    'Role': e.role,
    'NIK': e.nik || '-',
    'No. HP': e.phone || '-',
    'Tanggal Masuk': e.hire_date || '-',
    'Departemen': (e as any).departments?.name || '-',
    'Jabatan': (e as any).positions?.name || '-',
    'Gaji Pokok': e.base_salary,
    'Tunjangan Makan': e.meal_allowance,
    'Tunjangan Transport': e.transport_allowance,
    'Bank': e.bank_name || '-',
    'No. Rekening': e.bank_account || '-',
    'Status': e.status,
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const colWidths = Object.keys(rows[0] || {}).map(k => ({ wch: Math.max(k.length, 14) }))
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Karyawan')
  XLSX.writeFile(wb, `karyawan_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export function exportAttendanceToExcel(attendances: Attendance[], month: number, year: number) {
  const rows = attendances.map(a => ({
    'ID Karyawan': (a as any).profiles?.employee_id || '-',
    'Nama': (a as any).profiles?.full_name || '-',
    'Tanggal': a.date,
    'Jam Masuk': a.clock_in_time ? new Date(a.clock_in_time).toLocaleTimeString('id-ID') : '-',
    'Jam Keluar': a.clock_out_time ? new Date(a.clock_out_time).toLocaleTimeString('id-ID') : '-',
    'Status': a.status,
    'Lokasi Masuk': a.clock_in_lat ? `${a.clock_in_lat}, ${a.clock_in_lng}` : '-',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Kehadiran')
  XLSX.writeFile(wb, `kehadiran_${year}_${String(month).padStart(2, '0')}.xlsx`)
}
