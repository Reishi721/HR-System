-- ================================================================
-- Migration 012: Audit Log
-- ================================================================

-- Audit Logs Table
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,       -- CREATE | UPDATE | DELETE | LOGIN | LOGOUT | APPROVE | REJECT
  module VARCHAR(100) NOT NULL,      -- employees | leave_requests | payroll | contracts | etc.
  record_id UUID,                    -- ID of the affected record
  record_label TEXT,                 -- Human-readable description of the record
  old_data JSONB,                    -- Previous state (for updates/deletes)
  new_data JSONB,                    -- New state (for creates/updates)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_module ON audit_logs(module);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR can view all audit logs" ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'hr')
);
CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Trigger function to log leave request changes
CREATE OR REPLACE FUNCTION log_leave_request_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, module, record_id, record_label, new_data)
    VALUES (NEW.user_id, 'CREATE', 'leave_requests', NEW.id, 'Pengajuan Cuti: ' || NEW.type, row_to_json(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, action, module, record_id, record_label, old_data, new_data)
    VALUES (auth.uid(), 'UPDATE', 'leave_requests', NEW.id,
      'Cuti ' || NEW.type || ' - Status: ' || NEW.status,
      row_to_json(OLD), row_to_json(NEW));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_leave_requests
AFTER INSERT OR UPDATE ON leave_requests
FOR EACH ROW EXECUTE FUNCTION log_leave_request_change();

-- Trigger function to log payslip changes
CREATE OR REPLACE FUNCTION log_payslip_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, module, record_id, record_label, new_data)
    VALUES (auth.uid(), 'CREATE', 'payslips', NEW.id,
      'Payslip ' || NEW.year || '/' || NEW.month, row_to_json(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, action, module, record_id, record_label, old_data, new_data)
    VALUES (auth.uid(), 'UPDATE', 'payslips', NEW.id,
      'Payslip ' || NEW.year || '/' || NEW.month || ' - ' || NEW.status,
      row_to_json(OLD), row_to_json(NEW));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_payslips
AFTER INSERT OR UPDATE ON payslips
FOR EACH ROW EXECUTE FUNCTION log_payslip_change();

-- Helper function: Insert audit log from application code
CREATE OR REPLACE FUNCTION insert_audit_log(
  p_action VARCHAR,
  p_module VARCHAR,
  p_record_id UUID DEFAULT NULL,
  p_record_label TEXT DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO audit_logs (user_id, action, module, record_id, record_label, old_data, new_data)
  VALUES (auth.uid(), p_action, p_module, p_record_id, p_record_label, p_old_data, p_new_data)
  RETURNING id INTO log_id;
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
