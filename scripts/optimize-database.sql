-- Performance optimization indexes for production
-- Run this after initial setup for better performance

-- Attendance Records Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON "AttendanceRecord"("userId", "date");
CREATE INDEX IF NOT EXISTS idx_attendance_date ON "AttendanceRecord"("date");
CREATE INDEX IF NOT EXISTS idx_attendance_status ON "AttendanceRecord"("status");
CREATE INDEX IF NOT EXISTS idx_attendance_user_status ON "AttendanceRecord"("userId", "status");

-- Leave Requests Indexes
CREATE INDEX IF NOT EXISTS idx_leave_user_status ON "LeaveRequest"("userId", "status");
CREATE INDEX IF NOT EXISTS idx_leave_start_date ON "LeaveRequest"("startDate");
CREATE INDEX IF NOT EXISTS idx_leave_status ON "LeaveRequest"("status");
CREATE INDEX IF NOT EXISTS idx_leave_user_date ON "LeaveRequest"("userId", "startDate");

-- User Indexes
CREATE INDEX IF NOT EXISTS idx_user_email ON "User"("email");
CREATE INDEX IF NOT EXISTS idx_user_employee_id ON "User"("employeeId");
CREATE INDEX IF NOT EXISTS idx_user_role ON "User"("role");
CREATE INDEX IF NOT EXISTS idx_user_department ON "User"("department");

-- Salary Records Indexes
CREATE INDEX IF NOT EXISTS idx_salary_user_month ON "SalaryRecord"("userId", "month", "year");
CREATE INDEX IF NOT EXISTS idx_salary_status ON "SalaryRecord"("status");
CREATE INDEX IF NOT EXISTS idx_salary_user_status ON "SalaryRecord"("userId", "status");

-- Notifications Indexes
CREATE INDEX IF NOT EXISTS idx_notification_user_read ON "Notification"("userId", "isRead");
CREATE INDEX IF NOT EXISTS idx_notification_created ON "Notification"("createdAt");

-- System Settings Indexes
CREATE INDEX IF NOT EXISTS idx_settings_key ON "SystemSetting"("key");

-- Add database constraints for data integrity
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT check_valid_hours 
CHECK ("totalHours" IS NULL OR ("totalHours" >= 0 AND "totalHours" <= 24));

ALTER TABLE "LeaveRequest" ADD CONSTRAINT check_valid_dates 
CHECK ("startDate" <= "endDate");

ALTER TABLE "SalaryRecord" ADD CONSTRAINT check_positive_amounts 
CHECK ("basicSalary" > 0 AND "totalSalary" >= "basicSalary");

-- Update statistics for query planner
ANALYZE;
