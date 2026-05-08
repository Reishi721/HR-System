-- Function to handle leave request status changes and notify user
CREATE OR REPLACE FUNCTION notify_leave_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (user_id, title, message)
    VALUES (
      NEW.user_id,
      'Update Status Pengajuan Cuti',
      'Status pengajuan ' || NEW.type || ' Anda berubah menjadi ' || NEW.status || '.'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to execute the function after update on leave_requests
DROP TRIGGER IF EXISTS tr_notify_leave_status_change ON leave_requests;
CREATE TRIGGER tr_notify_leave_status_change
AFTER UPDATE ON leave_requests
FOR EACH ROW
EXECUTE FUNCTION notify_leave_status_change();
