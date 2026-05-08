-- Advanced HRIS Module Migration

-- 1. Attendances
CREATE TABLE attendances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in_time TIMESTAMP WITH TIME ZONE,
  clock_in_lat DOUBLE PRECISION,
  clock_in_lng DOUBLE PRECISION,
  clock_in_photo TEXT,
  clock_out_time TIMESTAMP WITH TIME ZONE,
  clock_out_lat DOUBLE PRECISION,
  clock_out_lng DOUBLE PRECISION,
  clock_out_photo TEXT,
  status VARCHAR(50) DEFAULT 'present', -- 'present', 'late', 'absent'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view and insert own attendance" ON attendances FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Managers can view team attendance" ON attendances FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND manager_id = auth.uid())
);
CREATE POLICY "HR can view all attendance" ON attendances FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'hr')
);

-- 2. Announcements
CREATE TABLE announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view active announcements" ON announcements FOR SELECT USING (auth.role() = 'authenticated' AND is_active = TRUE);
CREATE POLICY "Only HR can insert/update announcements" ON announcements FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'hr')
);

-- 3. Payslips
CREATE TABLE payslips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  month INT NOT NULL,
  year INT NOT NULL,
  base_salary DECIMAL(15, 2) NOT NULL,
  deductions DECIMAL(15, 2) DEFAULT 0,
  net_salary DECIMAL(15, 2) NOT NULL,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month, year)
);

ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own payslips" ON payslips FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "HR manages payslips" ON payslips FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'hr')
);

-- 4. Notifications
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users perform all on own notifications" ON notifications FOR ALL USING (user_id = auth.uid());
CREATE POLICY "HR can insert notifications for anyone" ON notifications FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'hr')
);
