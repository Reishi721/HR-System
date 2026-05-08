-- ================================================================
-- Migration 009: Overtime & Reimbursement
-- ================================================================

-- 1. Overtime (Lembur) Table
CREATE TABLE overtimes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  hours DECIMAL(4,2) NOT NULL, -- calculated hours
  reason TEXT NOT NULL,
  status VARCHAR(30) DEFAULT 'pending_manager' NOT NULL, -- pending_manager | pending_hr | approved | rejected
  manager_note TEXT,
  hr_note TEXT,
  manager_approved_by UUID REFERENCES profiles(id),
  hr_approved_by UUID REFERENCES profiles(id),
  manager_approved_at TIMESTAMP WITH TIME ZONE,
  hr_approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Reimbursement / Klaim Table
CREATE TABLE reimbursements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category VARCHAR(100) NOT NULL, -- 'transport' | 'meal' | 'medical' | 'accommodation' | 'other'
  amount DECIMAL(15,2) NOT NULL,
  description TEXT NOT NULL,
  receipt_date DATE NOT NULL,
  attachment_url TEXT, -- Upload bukti/struk
  status VARCHAR(30) DEFAULT 'pending' NOT NULL, -- pending | approved | rejected | paid
  note TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE overtimes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reimbursements ENABLE ROW LEVEL SECURITY;

-- Overtime RLS
CREATE POLICY "Users view own overtimes" ON overtimes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert own overtime" ON overtimes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Managers view team overtimes" ON overtimes FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND manager_id = auth.uid())
);
CREATE POLICY "Managers update team overtimes" ON overtimes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND manager_id = auth.uid())
);
CREATE POLICY "HR manage all overtimes" ON overtimes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'hr')
);

-- Reimbursement RLS
CREATE POLICY "Users view own reimbursements" ON reimbursements FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert own reimbursement" ON reimbursements FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "HR manage all reimbursements" ON reimbursements FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'hr')
);
