-- ================================================================
-- Migration 010: Contracts (PKWT/PKWTT) & Employee Loans
-- ================================================================

-- 1. Employee Contracts Table
CREATE TABLE contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  contract_number VARCHAR(100),
  contract_type VARCHAR(20) NOT NULL, -- 'PKWT' | 'PKWTT'
  start_date DATE NOT NULL,
  end_date DATE, -- NULL for PKWTT (permanent)
  position VARCHAR(255),
  department VARCHAR(255),
  salary DECIMAL(15,2),
  document_url TEXT,
  signed_by_employee BOOLEAN DEFAULT FALSE,
  signed_by_hr BOOLEAN DEFAULT FALSE,
  employee_signed_at TIMESTAMP WITH TIME ZONE,
  hr_signed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(30) DEFAULT 'draft', -- draft | active | expired | terminated
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Employee Loans Table
CREATE TABLE employee_loans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  purpose TEXT NOT NULL,
  installment_count INT NOT NULL DEFAULT 12, -- jumlah cicilan (bulan)
  installment_amount DECIMAL(15,2) NOT NULL, -- amount per cicilan
  disbursed_at DATE, -- tanggal cair
  status VARCHAR(30) DEFAULT 'pending', -- pending | approved | active | completed | rejected
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Loan Installments (Cicilan)
CREATE TABLE loan_installments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID REFERENCES employee_loans(id) ON DELETE CASCADE NOT NULL,
  installment_number INT NOT NULL, -- cicilan ke-berapa
  due_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  payslip_id UUID, -- akan di-link ke payslips nanti
  status VARCHAR(20) DEFAULT 'pending', -- pending | paid
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_installments ENABLE ROW LEVEL SECURITY;

-- Contracts RLS
CREATE POLICY "Users view own contracts" ON contracts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "HR manage all contracts" ON contracts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'hr')
);

-- Loans RLS
CREATE POLICY "Users view own loans" ON employee_loans FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users request loans" ON employee_loans FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "HR manage all loans" ON employee_loans FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'hr')
);

-- Loan Installments RLS
CREATE POLICY "Users view own installments" ON loan_installments FOR SELECT USING (
  EXISTS (SELECT 1 FROM employee_loans WHERE id = loan_id AND user_id = auth.uid())
);
CREATE POLICY "HR manage installments" ON loan_installments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'hr')
);

-- Function: Auto-generate installments when loan is approved
CREATE OR REPLACE FUNCTION generate_loan_installments()
RETURNS TRIGGER AS $$
DECLARE
  i INT;
  due DATE;
BEGIN
  IF NEW.status = 'active' AND OLD.status = 'pending' AND NEW.disbursed_at IS NOT NULL THEN
    FOR i IN 1..NEW.installment_count LOOP
      due := (NEW.disbursed_at + (i * INTERVAL '1 month'))::DATE;
      INSERT INTO loan_installments (loan_id, installment_number, due_date, amount)
      VALUES (NEW.id, i, due, NEW.installment_amount);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_loan_installments_trigger
AFTER UPDATE ON employee_loans
FOR EACH ROW
EXECUTE FUNCTION generate_loan_installments();

-- Function: Notify employee 30 days before contract expires
CREATE OR REPLACE FUNCTION check_contract_expiry()
RETURNS void AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT c.*, p.full_name
    FROM contracts c
    JOIN profiles p ON c.user_id = p.id
    WHERE c.status = 'active'
      AND c.contract_type = 'PKWT'
      AND c.end_date IS NOT NULL
      AND c.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
  LOOP
    INSERT INTO notifications (user_id, title, message)
    VALUES (
      rec.user_id,
      '⚠️ Kontrak Hampir Berakhir',
      'Kontrak kerja Anda (' || rec.contract_number || ') akan berakhir pada ' || to_char(rec.end_date, 'DD Mon YYYY') || '. Hubungi HR untuk perpanjangan.'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
