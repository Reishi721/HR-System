import { useQuery } from '@tanstack/react-query'
import { Wallet, Download, CheckCircle, FileText, Lock } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/ui/PageHeader'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency } from '@/lib/payroll-calculator'
import type { Payslip } from '@/types/database'

export function PayslipsEmployee() {
  const { profile } = useAuth()

  const { data: payslips, isLoading } = useQuery({
    queryKey: ['employee-payslips', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      // Only get published payslips for employees
      const { data } = await supabase.from('payslips').select('*').eq('user_id', profile.id).eq('status', 'published').order('year', { ascending: false }).order('month', { ascending: false })
      return data as Payslip[]
    },
    enabled: !!profile?.id,
  })

  // To build PDF feature, wait until phase 4 generation completion, but leaving UI placeholder
  const handleDownload = (_id: string) => {
    alert('Fitur download PDF sedang dimplementasi di server. Silakan screenshot halaman detail ini untuk sementara.')
  }

  return (
    <AppShell>
      <PageHeader
        title="Slip Gaji (Payslips)"
        description="Akses riwayat slip gaji resmi bulanan Anda"
        icon={Wallet}
        breadcrumbs={[{ label: 'Employee Space' }, { label: 'Payslip' }]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            <div className="text-center text-slate-500 py-10">Memuat slip gaji...</div>
          ) : payslips?.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Belum ada slip gaji yang dipublikasi.</p>
            </div>
          ) : (
            payslips?.map(ps => (
              <Card key={ps.id} className="card-premium relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                <CardContent className="p-0">
                  <div className="p-5 sm:flex items-center justify-between">
                    <div className="flex items-center gap-4 mb-4 sm:mb-0 pl-2 text-slate-800">
                      <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Wallet className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg mb-0.5">Bulan {ps.month} / {ps.year}</h4>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                          <span className="text-sm font-medium text-slate-500">Telah Dipublikasi (Resmi)</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right sm:pr-4">
                      <p className="text-xs text-slate-500 mb-1">Total Take Home Pay</p>
                      <p className="text-2xl font-black font-mono text-emerald-600 tracking-tight">{formatCurrency(ps.net_salary)}</p>
                    </div>
                  </div>
                  
                  {/* Payslip Details Collapsible (default open for highest) */}
                  <div className="bg-slate-50/80 border-t border-slate-100 p-5 px-7">
                    <div className="grid sm:grid-cols-2 gap-x-12 gap-y-6">
                      <div>
                        <h5 className="font-semibold text-slate-700 text-sm mb-3 uppercase tracking-wider">A. Pendapatan</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-slate-500">Gaji Pokok</span><span className="font-mono text-slate-800 font-medium">{formatCurrency(ps.base_salary)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Tnj. Makan</span><span className="font-mono text-slate-800 font-medium">{formatCurrency((ps.allowances as any)?.meal || 0)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Tnj. Transport</span><span className="font-mono text-slate-800 font-medium">{formatCurrency((ps.allowances as any)?.transport || 0)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Uang Lembur</span><span className="font-mono text-slate-800 font-medium">{formatCurrency(ps.overtime_pay)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Reimbursement</span><span className="font-mono text-slate-800 font-medium">{formatCurrency(ps.reimbursement_total)}</span></div>
                          <div className="pt-2 mt-2 border-t border-slate-200 border-dashed flex justify-between font-semibold">
                            <span className="text-slate-700">Total Kotor</span><span className="font-mono text-indigo-700">{formatCurrency(ps.gross_salary + ps.reimbursement_total)}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h5 className="font-semibold text-slate-700 text-sm mb-3 uppercase tracking-wider">B. Potongan</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-slate-500">BPJS Ketenagakerjaan (JHT+JP)</span><span className="font-mono text-red-600 font-medium">-{formatCurrency(ps.bpjs_jht_employee + ps.bpjs_jp_employee)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">BPJS Kesehatan (1%)</span><span className="font-mono text-red-600 font-medium">-{formatCurrency(ps.bpjs_kesehatan_employee)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Pajak PPh 21</span><span className="font-mono text-red-600 font-medium">-{formatCurrency(ps.pph21)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Potongan Pinjaman/Kasbon</span><span className="font-mono text-red-600 font-medium">-{formatCurrency(ps.loan_deduction)}</span></div>
                          <div className="pt-2 mt-2 border-t border-slate-200 border-dashed flex justify-between font-semibold">
                            <span className="text-slate-700">Total Potongan</span><span className="font-mono text-red-700">-{formatCurrency(ps.total_deductions)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => handleDownload(ps.id)} className="gap-2">
                        <Download className="h-4 w-4" /> Download PDF Slip Resmi
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="lg:col-span-1">
          <Card className="card-premium sticky top-20">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Lock className="h-4 w-4 text-slate-400" /> Informasi Rahasia Terjaga
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Setiap dokumen gaji dan informasi kompensasi Anda disimpan secara rahasia (Confidential). Mohon untuk tidak membagikan detail slip gaji ini kepada pihak lain tanpa kepentingan prosedural.
              </p>
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <h5 className="font-semibold text-indigo-900 text-sm mb-2">Penjelasan Potongan</h5>
                <ul className="text-xs text-indigo-700 space-y-2 list-disc pl-4 marker:text-indigo-300">
                  <li><strong>BPJS Kes:</strong> Anda membayar 1%, perusahaan 4%.</li>
                  <li><strong>BPJS JHT:</strong> Anda membayar 2%, perusahaan 3.7%.</li>
                  <li><strong>PPh 21:</strong> Dihitung otomatis sesuai tarif PTKP terbaru dari DJP.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
