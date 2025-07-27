-- Add late approval system
CREATE TABLE IF NOT EXISTS late_approval_requests (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    date DATE NOT NULL,
    late_minutes INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approved_by TEXT,
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_late_approval_user_date ON late_approval_requests(user_id, date);
CREATE INDEX IF NOT EXISTS idx_late_approval_status ON late_approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_late_approval_date ON late_approval_requests(date);

-- Update leave requests to track informed/uninformed status
ALTER TABLE leave_requests ADD COLUMN is_informed BOOLEAN DEFAULT true;
ALTER TABLE leave_requests ADD COLUMN leave_category TEXT DEFAULT 'REGULAR' CHECK (leave_category IN ('REGULAR', 'WEEKEND_ADJACENT', 'UNINFORMED'));

-- Update salary records to track weekend deductions
ALTER TABLE salary_records ADD COLUMN weekend_deductions REAL DEFAULT 0;
ALTER TABLE salary_records ADD COLUMN uninformed_leave_deductions REAL DEFAULT 0;

-- Update system settings to remove overtime
UPDATE system_settings SET overtime_threshold = 0 WHERE id IS NOT NULL;

-- Add trigger to update timestamps
CREATE TRIGGER IF NOT EXISTS update_late_approval_timestamp 
    AFTER UPDATE ON late_approval_requests
    BEGIN
        UPDATE late_approval_requests SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Insert default system settings if none exist
INSERT OR IGNORE INTO system_settings (
    id,
    working_hours_start,
    working_hours_end,
    late_threshold,
    overtime_threshold,
    auto_deduct_late_arrival,
    auto_deduct_leave,
    company_name
) VALUES (
    'default',
    '09:00',
    '17:00',
    0, -- No grace period - immediate deduction
    0, -- No overtime
    true,
    true,
    'Ruba Agencies'
);
