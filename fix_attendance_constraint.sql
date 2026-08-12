-- Drop if it's a constraint
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS uq_attendance_active_event_roll;

-- Drop if it's a unique index
DROP INDEX IF EXISTS uq_attendance_active_event_roll;

-- Drop the old constraint
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS uq_attendance_record;

-- Add the correct constraint for daily attendance
ALTER TABLE attendance ADD CONSTRAINT uq_attendance_record UNIQUE (event_id, roll_number, date);
