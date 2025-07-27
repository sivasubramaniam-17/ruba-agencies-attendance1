-- Fix system settings table and ensure proper structure
-- This script ensures the system_settings table has the correct structure

-- First, let's check if the table exists and create it if it doesn't
CREATE TABLE IF NOT EXISTS system_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    working_hours_start TEXT NOT NULL DEFAULT '09:00',
    working_hours_end TEXT NOT NULL DEFAULT '17:00',
    late_threshold INTEGER NOT NULL DEFAULT 15,
    overtime_threshold REAL NOT NULL DEFAULT 8.0,
    late_deduction_rate REAL NOT NULL DEFAULT 50.0,
    leave_deduction_rate REAL NOT NULL DEFAULT 100.0,
    auto_deduct_late_arrival BOOLEAN NOT NULL DEFAULT true,
    auto_deduct_leave BOOLEAN NOT NULL DEFAULT true,
    weekend_days TEXT[] DEFAULT ARRAY['SUNDAY'],
    holiday_dates TIMESTAMP[],
    company_name TEXT NOT NULL DEFAULT 'Ruba Agencies',
    company_address TEXT,
    company_phone TEXT,
    company_email TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings if none exist
INSERT INTO system_settings (
    id,
    working_hours_start,
    working_hours_end,
    late_threshold,
    overtime_threshold,
    late_deduction_rate,
    leave_deduction_rate,
    auto_deduct_late_arrival,
    auto_deduct_leave,
    weekend_days,
    company_name
) VALUES (
    'default',
    '09:00',
    '17:00',
    15,
    8.0,
    50.0,
    100.0,
    true,
    true,
    ARRAY['SUNDAY'],
    'Ruba Agencies'
) ON CONFLICT (id) DO NOTHING;

-- Update the updated_at column trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for system_settings
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Ensure salary_records table has all necessary columns
ALTER TABLE salary_records 
ADD COLUMN IF NOT EXISTS late_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_late_minutes REAL DEFAULT 0;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_settings_id ON system_settings(id);
CREATE INDEX IF NOT EXISTS idx_salary_records_user_month_year ON salary_records(user_id, month, year);
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_date ON attendance_records(user_id, date);

-- Add comments for documentation
COMMENT ON TABLE system_settings IS 'System-wide configuration settings for attendance and payroll';
COMMENT ON COLUMN system_settings.working_hours_start IS 'Daily work start time in HH:MM format';
COMMENT ON COLUMN system_settings.working_hours_end IS 'Daily work end time in HH:MM format';
COMMENT ON COLUMN system_settings.late_threshold IS 'Grace period in minutes before marking as late';
COMMENT ON COLUMN system_settings.auto_deduct_late_arrival IS 'Whether to automatically deduct salary for late arrivals';
COMMENT ON COLUMN system_settings.auto_deduct_leave IS 'Whether to automatically deduct salary for unpaid leave';
COMMENT ON COLUMN system_settings.weekend_days IS 'Array of weekend days (only SUNDAY for this system)';
