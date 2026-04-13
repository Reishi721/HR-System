-- 1. Create custom ENUM types
CREATE TYPE user_role AS ENUM ('employee', 'manager', 'hr');
CREATE TYPE leave_type AS ENUM ('cuti', 'sakit', 'izin');
CREATE TYPE leave_status AS ENUM ('pending_manager', 'pending_hr', 'approved', 'rejected');

-- 2. Create Companies (PT) Table
CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Profiles Table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  role user_role DEFAULT 'employee' NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Who approves this user's leave
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Leave Balances Table (Jatah Cuti)
CREATE TABLE leave_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  year INT NOT NULL,
  total_allocated INT DEFAULT 12 NOT NULL, -- Standard jatah cuti, e.g., 12 days
  total_used INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, year)
);

-- 5. Create Leave Requests Table
CREATE TABLE leave_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type leave_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status leave_status DEFAULT 'pending_manager' NOT NULL,
  reason TEXT,
  attachment_url TEXT, -- For medical certificate/surat sakit
  location_lat DOUBLE PRECISION, -- Latitude when requesting
  location_lng DOUBLE PRECISION, -- Longitude when requesting
  manager_approved_at TIMESTAMP WITH TIME ZONE,
  hr_approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- 6. Setup Basic RLS Policies

-- Companies: Everyone authenticated can view, only HR can modify
CREATE POLICY "Everyone can view companies" ON companies FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Only HR can insert companies" ON companies FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'hr')
);
CREATE POLICY "Only HR can update companies" ON companies FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'hr')
);

-- Profiles: Users can view their own, Managers can view their employees, HR can view all
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Managers can view their employees" ON profiles FOR SELECT USING (manager_id = auth.uid());
CREATE POLICY "HR can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'hr')
);
CREATE POLICY "Only HR can insert/update profiles" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'hr')
);

-- Leave Balances: Users view their own, HR views all
CREATE POLICY "Users can view their own leave balances" ON leave_balances FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "HR can view all leave balances" ON leave_balances FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'hr')
);
CREATE POLICY "HR can insert/update leave balances" ON leave_balances FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'hr')
);

-- Leave Requests
CREATE POLICY "Users can view and insert their own requests" ON leave_requests FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own requests" ON leave_requests FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Managers can view and update requests from their employees" ON leave_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND manager_id = auth.uid())
);
CREATE POLICY "Managers can update requests from their employees" ON leave_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND manager_id = auth.uid())
);

CREATE POLICY "HR can view and update all requests" ON leave_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'hr')
);

-- 7. Trigger to automatically deduct leave balance upon full approval (status = 'approved' and type = 'cuti')
CREATE OR REPLACE FUNCTION deduct_leave_balance()
RETURNS TRIGGER AS $$
DECLARE
  days_requested INT;
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.type = 'cuti' THEN
    days_requested := (NEW.end_date - NEW.start_date) + 1;
    UPDATE leave_balances
    SET total_used = total_used + days_requested
    WHERE user_id = NEW.user_id AND year = EXTRACT(YEAR FROM NEW.start_date);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deduct_leave_balance_trigger
AFTER UPDATE ON leave_requests
FOR EACH ROW
EXECUTE FUNCTION deduct_leave_balance();
