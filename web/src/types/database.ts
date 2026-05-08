// ================================================================
// HRIS Database Types
// ================================================================

export type UserRole = 'employee' | 'manager' | 'hr'
export type LeaveType = 'cuti' | 'sakit' | 'izin'
export type LeaveStatus = 'pending_manager' | 'pending_hr' | 'approved' | 'rejected'
export type OvertimeStatus = 'pending_manager' | 'pending_hr' | 'approved' | 'rejected'
export type ReimbursementStatus = 'pending' | 'approved' | 'rejected' | 'paid'
export type ContractType = 'PKWT' | 'PKWTT'
export type ContractStatus = 'draft' | 'active' | 'expired' | 'terminated'
export type LoanStatus = 'pending' | 'approved' | 'active' | 'completed' | 'rejected'
export type PayslipStatus = 'draft' | 'published'
export type AttendanceStatus = 'present' | 'late' | 'absent'

// ================================================================

export interface Company {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  npwp: string | null
  logo_url: string | null
  industry: string | null
  created_at: string
}

export interface Department {
  id: string
  company_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  // Joined
  companies?: { name: string }
  _count?: { employees: number }
}

export interface Position {
  id: string
  department_id: string
  name: string
  level: string | null
  base_salary: number
  created_at: string
  updated_at: string
  // Joined
  departments?: { name: string }
}

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  company_id: string | null
  manager_id: string | null
  department_id: string | null
  position_id: string | null
  employee_id: string | null
  nik: string | null
  phone: string | null
  avatar_url: string | null
  hire_date: string | null
  birth_date: string | null
  gender: 'male' | 'female' | null
  address: string | null
  bank_name: string | null
  bank_account: string | null
  npwp: string | null
  base_salary: number
  meal_allowance: number
  transport_allowance: number
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
  // Joined
  companies?: { name: string }
  departments?: { name: string }
  positions?: { name: string }
  manager?: { full_name: string }
}

export interface LeaveBalance {
  id: string
  user_id: string
  year: number
  total_allocated: number
  total_used: number
  created_at: string
  updated_at: string
}

export interface LeaveRequest {
  id: string
  user_id: string
  type: LeaveType
  start_date: string
  end_date: string
  status: LeaveStatus
  reason: string | null
  attachment_url: string | null
  location_lat: number | null
  location_lng: number | null
  manager_approved_at: string | null
  hr_approved_at: string | null
  created_at: string
  updated_at: string
  // Joined
  profiles?: { full_name: string; employee_id: string | null; avatar_url: string | null }
}

export interface Attendance {
  id: string
  user_id: string
  date: string
  clock_in_time: string | null
  clock_in_lat: number | null
  clock_in_lng: number | null
  clock_in_photo: string | null
  clock_out_time: string | null
  clock_out_lat: number | null
  clock_out_lng: number | null
  clock_out_photo: string | null
  status: AttendanceStatus
  created_at: string
  // Joined
  profiles?: { full_name: string; employee_id: string | null }
}

export interface Overtime {
  id: string
  user_id: string
  date: string
  start_time: string
  end_time: string
  hours: number
  reason: string
  status: OvertimeStatus
  manager_note: string | null
  hr_note: string | null
  manager_approved_by: string | null
  hr_approved_by: string | null
  manager_approved_at: string | null
  hr_approved_at: string | null
  created_at: string
  updated_at: string
  // Joined
  profiles?: { full_name: string; employee_id: string | null }
}

export interface Reimbursement {
  id: string
  user_id: string
  category: string
  amount: number
  description: string
  receipt_date: string
  attachment_url: string | null
  status: ReimbursementStatus
  note: string | null
  approved_by: string | null
  approved_at: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
  // Joined
  profiles?: { full_name: string; employee_id: string | null }
}

export interface Contract {
  id: string
  user_id: string
  contract_number: string | null
  contract_type: ContractType
  start_date: string
  end_date: string | null
  position: string | null
  department: string | null
  salary: number | null
  document_url: string | null
  signed_by_employee: boolean
  signed_by_hr: boolean
  employee_signed_at: string | null
  hr_signed_at: string | null
  status: ContractStatus
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined
  profiles?: { full_name: string; employee_id: string | null; avatar_url: string | null }
}

export interface EmployeeLoan {
  id: string
  user_id: string
  amount: number
  purpose: string
  installment_count: number
  installment_amount: number
  disbursed_at: string | null
  status: LoanStatus
  approved_by: string | null
  approved_at: string | null
  note: string | null
  created_at: string
  updated_at: string
  // Joined
  profiles?: { full_name: string; employee_id: string | null }
  loan_installments?: LoanInstallment[]
}

export interface LoanInstallment {
  id: string
  loan_id: string
  installment_number: number
  due_date: string
  amount: number
  paid_at: string | null
  payslip_id: string | null
  status: 'pending' | 'paid'
  created_at: string
}

export interface Payslip {
  id: string
  user_id: string
  month: number
  year: number
  status: PayslipStatus
  base_salary: number
  gross_salary: number
  allowances: Record<string, number>
  overtime_pay: number
  reimbursement_total: number
  loan_deduction: number
  bpjs_kesehatan_employee: number
  bpjs_kesehatan_employer: number
  bpjs_jht_employee: number
  bpjs_jht_employer: number
  bpjs_jp_employee: number
  bpjs_jp_employer: number
  bpjs_jkk: number
  bpjs_jkm: number
  pph21: number
  deductions: number
  total_deductions: number
  net_salary: number
  period_start: string | null
  period_end: string | null
  pdf_url: string | null
  notes: string | null
  published_at: string | null
  created_by: string | null
  created_at: string
  // Joined
  profiles?: { full_name: string; employee_id: string | null; bank_name: string | null; bank_account: string | null }
}

export interface Announcement {
  id: string
  title: string
  content: string
  created_by: string | null
  is_active: boolean
  created_at: string
  // Joined
  profiles?: { full_name: string }
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  module: string
  record_id: string | null
  record_label: string | null
  old_data: Record<string, any> | null
  new_data: Record<string, any> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  // Joined
  profiles?: { full_name: string }
}
