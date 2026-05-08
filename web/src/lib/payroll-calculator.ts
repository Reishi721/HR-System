// ================================================================
// BPJS & Payroll Calculator (Indonesia 2024)
// ================================================================

export interface PayrollInput {
  baseSalary: number
  mealAllowance: number
  transportAllowance: number
  overtimePay: number
  reimbursementTotal: number
  loanDeduction: number
  ptkpStatus: 'TK0' | 'TK1' | 'TK2' | 'TK3' | 'K0' | 'K1' | 'K2' | 'K3' // PTKP category
}

export interface PayrollResult {
  // Income
  baseSalary: number
  mealAllowance: number
  transportAllowance: number
  overtimePay: number
  reimbursementTotal: number
  grossSalary: number

  // BPJS Kesehatan
  bpjsKesehatanEmployee: number  // 1% (max gaji 12jt)
  bpjsKesehatanEmployer: number  // 4% (max gaji 12jt)

  // BPJS Ketenagakerjaan
  bpjsJhtEmployee: number       // 2%
  bpjsJhtEmployer: number       // 3.7%
  bpjsJpEmployee: number        // 1% (max gaji 7jt)
  bpjsJpEmployer: number        // 2% (max gaji 7jt)
  bpjsJkk: number               // 0.24% employer
  bpjsJkm: number               // 0.3% employer

  // Tax
  pph21: number

  // Deductions
  totalEmployeeDeductions: number
  loanDeduction: number
  
  // Net
  netSalary: number
  
  // Employer cost
  totalEmployerContributions: number
}

// PTKP 2024 values (annual)
const PTKP: Record<string, number> = {
  TK0: 54_000_000,  // Tidak kawin, tidak punya tanggungan
  TK1: 58_500_000,  // Tidak kawin, 1 tanggungan
  TK2: 63_000_000,  // Tidak kawin, 2 tanggungan
  TK3: 67_500_000,  // Tidak kawin, 3 tanggungan
  K0: 58_500_000,   // Kawin, tidak ada tanggungan
  K1: 63_000_000,   // Kawin, 1 tanggungan
  K2: 67_500_000,   // Kawin, 2 tanggungan
  K3: 72_000_000,   // Kawin, 3 tanggungan
}

// PPh 21 Tax Brackets (annual, effective 2023)
function calculatePPh21Annual(pkp: number): number {
  if (pkp <= 0) return 0
  let tax = 0
  if (pkp <= 60_000_000) {
    tax = pkp * 0.05
  } else if (pkp <= 250_000_000) {
    tax = 60_000_000 * 0.05 + (pkp - 60_000_000) * 0.15
  } else if (pkp <= 500_000_000) {
    tax = 60_000_000 * 0.05 + 190_000_000 * 0.15 + (pkp - 250_000_000) * 0.25
  } else if (pkp <= 5_000_000_000) {
    tax = 60_000_000 * 0.05 + 190_000_000 * 0.15 + 250_000_000 * 0.25 + (pkp - 500_000_000) * 0.30
  } else {
    tax = 60_000_000 * 0.05 + 190_000_000 * 0.15 + 250_000_000 * 0.25 + 4_500_000_000 * 0.30 + (pkp - 5_000_000_000) * 0.35
  }
  return Math.round(tax)
}

export function calculatePayroll(input: PayrollInput): PayrollResult {
  const { baseSalary, mealAllowance, transportAllowance, overtimePay, reimbursementTotal, loanDeduction, ptkpStatus } = input

  const grossSalary = baseSalary + mealAllowance + transportAllowance + overtimePay

  // BPJS Kesehatan: max upah pokok 12 juta
  const bpjsKesCap = Math.min(baseSalary, 12_000_000)
  const bpjsKesehatanEmployee = Math.round(bpjsKesCap * 0.01)
  const bpjsKesehatanEmployer = Math.round(bpjsKesCap * 0.04)

  // BPJS JHT
  const bpjsJhtEmployee = Math.round(baseSalary * 0.02)
  const bpjsJhtEmployer = Math.round(baseSalary * 0.037)

  // BPJS JP: max upah 7 juta
  const bpjsJpCap = Math.min(baseSalary, 7_479_600) // 2024 ceiling
  const bpjsJpEmployee = Math.round(bpjsJpCap * 0.01)
  const bpjsJpEmployer = Math.round(bpjsJpCap * 0.02)

  // BPJS JKK & JKM (employer only)
  const bpjsJkk = Math.round(baseSalary * 0.0024)
  const bpjsJkm = Math.round(baseSalary * 0.003)

  // PPh 21 calculation
  const annualGross = grossSalary * 12
  const jabatanDeduction = Math.min(annualGross * 0.05, 6_000_000) // biaya jabatan
  const annualBpjsEmployee = (bpjsJhtEmployee + bpjsJpEmployee) * 12
  const netto = annualGross - jabatanDeduction - annualBpjsEmployee
  const ptkp = PTKP[ptkpStatus] || PTKP.TK0
  const pkp = Math.max(0, Math.floor((netto - ptkp) / 1000) * 1000)
  const annualPph21 = calculatePPh21Annual(pkp)
  const pph21 = Math.round(annualPph21 / 12)

  const totalEmployeeDeductions = bpjsKesehatanEmployee + bpjsJhtEmployee + bpjsJpEmployee + pph21 + loanDeduction
  const netSalary = grossSalary + reimbursementTotal - totalEmployeeDeductions
  const totalEmployerContributions = bpjsKesehatanEmployer + bpjsJhtEmployer + bpjsJpEmployer + bpjsJkk + bpjsJkm

  return {
    baseSalary,
    mealAllowance,
    transportAllowance,
    overtimePay,
    reimbursementTotal,
    grossSalary,
    bpjsKesehatanEmployee,
    bpjsKesehatanEmployer,
    bpjsJhtEmployee,
    bpjsJhtEmployer,
    bpjsJpEmployee,
    bpjsJpEmployer,
    bpjsJkk,
    bpjsJkm,
    pph21,
    totalEmployeeDeductions,
    loanDeduction,
    netSalary,
    totalEmployerContributions,
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount)
}
