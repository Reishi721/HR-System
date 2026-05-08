-- ================================================================
-- Migration 008: Departments, Positions, Extended Profiles
-- ================================================================

-- 1. Departments Table
CREATE TABLE departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Positions / Jabatan Table
CREATE TABLE positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  level VARCHAR(100), -- e.g., 'Junior', 'Senior', 'Lead', 'Manager'
  base_salary DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Extend profiles table with new columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS position_id UUID REFERENCES positions(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50) UNIQUE; -- e.g., EMP-001
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nik VARCHAR(20); -- NIK KTP
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender VARCHAR(10); -- 'male' | 'female'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_account VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS npwp VARCHAR(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS base_salary DECIMAL(15,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS meal_allowance DECIMAL(15,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS transport_allowance DECIMAL(15,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'; -- 'active' | 'inactive'

-- 4. Extend companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS npwp VARCHAR(30);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry VARCHAR(100);

-- Enable RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

-- Departments RLS
CREATE POLICY "Authenticated can view departments" ON departments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "HR can manage departments" ON departments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'hr')
);

-- Positions RLS
CREATE POLICY "Authenticated can view positions" ON positions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "HR can manage positions" ON positions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'hr')
);
