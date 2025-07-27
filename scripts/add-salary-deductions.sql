-- Add new fields to salary_records table for detailed tracking
ALTER TABLE salary_records 
ADD COLUMN IF NOT EXISTS late_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_late_minutes DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS overtime_hours DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_deductions DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS leave_deductions DECIMAL(10,2) DEFAULT 0;

-- Update existing records to have proper default values
UPDATE salary_records 
SET 
  late_count = 0,
  total_late_minutes = 0,
  overtime_hours = 0,
  late_deductions = 0,
  leave_deductions = 0
WHERE 
  late_count IS NULL 
  OR total_late_minutes IS NULL 
  OR overtime_hours IS NULL 
  OR late_deductions IS NULL 
  OR leave_deductions IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_salary_records_month_year ON salary_records(month, year);
CREATE INDEX IF NOT EXISTS idx_salary_records_user_month_year ON salary_records(user_id, month, year);
CREATE INDEX IF NOT EXISTS idx_salary_records_is_paid ON salary_records(is_paid);

-- Add comments to document the new fields
COMMENT ON COLUMN salary_records.late_count IS 'Number of times employee was late in the month';
COMMENT ON COLUMN salary_records.total_late_minutes IS 'Total minutes employee was late (beyond grace period)';
COMMENT ON COLUMN salary_records.overtime_hours IS 'Total overtime hours worked in the month';
COMMENT ON COLUMN salary_records.late_deductions IS 'Amount deducted for late arrivals';
COMMENT ON COLUMN salary_records.leave_deductions IS 'Amount deducted for unpaid leave';

-- Ensure system_settings table has proper structure
CREATE TABLE IF NOT EXISTS system_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  working_hours_start TIME NOT NULL DEFAULT '09:00:00',
  working_hours_end TIME NOT NULL DEFAULT '17:00:00',
  late_threshold INTEGER NOT NULL DEFAULT 15,
  overtime_threshold DECIMAL(3,1) NOT NULL DEFAULT 8.0,
  auto_deduct_late_arrival BOOLEAN NOT NULL DEFAULT true,
  auto_deduct_leave BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default settings if none exist
INSERT INTO system_settings (id, working_hours_start, working_hours_end, late_threshold, overtime_threshold, auto_deduct_late_arrival, auto_deduct_leave)
VALUES ('default', '09:00:00', '17:00:00', 15, 8.0, true, true)
ON DUPLICATE KEY UPDATE id = id; -- Do nothing if already exists

-- Add comments to system_settings table
COMMENT ON TABLE system_settings IS 'System-wide settings for attendance and salary calculations';
COMMENT ON COLUMN system_settings.working_hours_start IS 'Daily work start time';
COMMENT ON COLUMN system_settings.working_hours_end IS 'Daily work end time';
COMMENT ON COLUMN system_settings.late_threshold IS 'Grace period in minutes before marking as late';
COMMENT ON COLUMN system_settings.overtime_threshold IS 'Hours after which overtime pay applies';
COMMENT ON COLUMN system_settings.auto_deduct_late_arrival IS 'Whether to automatically deduct for late arrivals';
COMMENT ON COLUMN system_settings.auto_deduct_leave IS 'Whether to automatically deduct for unpaid leave';
