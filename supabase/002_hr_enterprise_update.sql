-- 1. Extend leave_status enum (Actually PostgreSQL requires adding values carefully or replacing enum)
-- But we will use the existing leave_status and just add rejection_reason column
ALTER TABLE leave_requests
ADD COLUMN rejection_reason TEXT;

-- 2. Alter leave_type enum to support non-deducting leaves
-- Note: In Postgres, adding values to enum is done via ADD VALUE
ALTER TYPE leave_type ADD VALUE IF NOT EXISTS 'cuti_tahunan';
ALTER TYPE leave_type ADD VALUE IF NOT EXISTS 'cuti_hamil';
ALTER TYPE leave_type ADD VALUE IF NOT EXISTS 'cuti_menikah';
ALTER TYPE leave_type ADD VALUE IF NOT EXISTS 'sakit_dengan_surat';
ALTER TYPE leave_type ADD VALUE IF NOT EXISTS 'sakit_tanpa_surat';

-- 3. Add delegated_manager_id to profiles for temporary delegations
ALTER TABLE profiles
ADD COLUMN delegated_manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 4. Update Trigger to only deduct if 'cuti_tahunan' (previously it was just 'cuti')
CREATE OR REPLACE FUNCTION deduct_leave_balance()
RETURNS TRIGGER AS $$
DECLARE
  days_requested INT;
BEGIN
  -- Only deduct balance for 'cuti' or 'cuti_tahunan'
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND (NEW.type = 'cuti' OR NEW.type = 'cuti_tahunan') THEN
    days_requested := (NEW.end_date - NEW.start_date) + 1;
    UPDATE leave_balances
    SET total_used = total_used + days_requested
    WHERE user_id = NEW.user_id AND year = EXTRACT(YEAR FROM NEW.start_date);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
