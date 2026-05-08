-- ================================================================
-- Migration 011: Extended Payroll with BPJS & PPh21
-- ================================================================

-- Extend payslips table with full payroll breakdown
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft'; -- draft | published
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS gross_salary DECIMAL(15,2) DEFAULT 0;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS allowances JSONB DEFAULT '{}'; -- {meal: 0, transport: 0, ...}
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS overtime_pay DECIMAL(15,2) DEFAULT 0;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS reimbursement_total DECIMAL(15,2) DEFAULT 0;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS loan_deduction DECIMAL(15,2) DEFAULT 0;

-- BPJS Kesehatan
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS bpjs_kesehatan_employee DECIMAL(15,2) DEFAULT 0; -- 1% of salary (max salary cap)
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS bpjs_kesehatan_employer DECIMAL(15,2) DEFAULT 0; -- 4% of salary

-- BPJS Ketenagakerjaan
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS bpjs_jht_employee DECIMAL(15,2) DEFAULT 0;    -- 2% of salary
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS bpjs_jht_employer DECIMAL(15,2) DEFAULT 0;    -- 3.7% of salary
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS bpjs_jp_employee DECIMAL(15,2) DEFAULT 0;     -- 1% of salary (max 7jt)
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS bpjs_jp_employer DECIMAL(15,2) DEFAULT 0;     -- 2% of salary
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS bpjs_jkk DECIMAL(15,2) DEFAULT 0;             -- 0.24% employer
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS bpjs_jkm DECIMAL(15,2) DEFAULT 0;             -- 0.3% employer

-- PPh 21
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS pph21 DECIMAL(15,2) DEFAULT 0;

-- Period & Totals
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS total_deductions DECIMAL(15,2) DEFAULT 0;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- Employee Salary Config (linked to profiles, replaces position base_salary)
-- This is stored in profiles.base_salary etc.

-- View: Payroll summary per period
CREATE OR REPLACE VIEW payroll_summary AS
SELECT
  p.month,
  p.year,
  COUNT(*) as employee_count,
  SUM(p.gross_salary) as total_gross,
  SUM(p.net_salary) as total_net,
  SUM(p.bpjs_kesehatan_employee + p.bpjs_jht_employee + p.bpjs_jp_employee) as total_employee_deductions,
  SUM(p.bpjs_kesehatan_employer + p.bpjs_jht_employer + p.bpjs_jp_employer + p.bpjs_jkk + p.bpjs_jkm) as total_employer_contributions,
  SUM(p.pph21) as total_pph21,
  p.status
FROM payslips p
GROUP BY p.month, p.year, p.status;
