-- Update the database schema to match the new Prisma schema

-- Add new columns to attendance_records table if they don't exist
DO $$ 
BEGIN
    -- Add markedBy column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'attendance_records' AND column_name = 'markedBy') THEN
        ALTER TABLE attendance_records ADD COLUMN "markedBy" TEXT;
    END IF;
    
    -- Add isManualEntry column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'attendance_records' AND column_name = 'isManualEntry') THEN
        ALTER TABLE attendance_records ADD COLUMN "isManualEntry" BOOLEAN DEFAULT false;
    END IF;
    
    -- Add overtimeHours column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'attendance_records' AND column_name = 'overtimeHours') THEN
        ALTER TABLE attendance_records ADD COLUMN "overtimeHours" DOUBLE PRECISION;
    END IF;
END $$;

-- Update users table column names if needed
DO $$
BEGIN
    -- Rename phoneNumber to phone if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'users' AND column_name = 'phoneNumber') THEN
        ALTER TABLE users RENAME COLUMN "phoneNumber" TO "phone";
    END IF;
    
    -- Rename dateOfJoining to joinDate if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'users' AND column_name = 'dateOfJoining') THEN
        ALTER TABLE users RENAME COLUMN "dateOfJoining" TO "joinDate";
    END IF;
    
    -- Add emergencyContact column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'emergencyContact') THEN
        ALTER TABLE users ADD COLUMN "emergencyContact" TEXT;
    END IF;
END $$;

-- Update salary_records table to match new schema
DO $$
BEGIN
    -- Rename basicSalary to baseSalary if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'salary_records' AND column_name = 'basicSalary') THEN
        ALTER TABLE salary_records RENAME COLUMN "basicSalary" TO "baseSalary";
    END IF;
    
    -- Remove allowances column if it exists (not in new schema)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'salary_records' AND column_name = 'allowances') THEN
        -- First, add the value to baseSalary if needed
        UPDATE salary_records SET "baseSalary" = "baseSalary" + COALESCE("allowances", 0);
        ALTER TABLE salary_records DROP COLUMN "allowances";
    END IF;
    
    -- Add new columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'salary_records' AND column_name = 'workingDays') THEN
        ALTER TABLE salary_records ADD COLUMN "workingDays" INTEGER DEFAULT 22;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'salary_records' AND column_name = 'presentDays') THEN
        ALTER TABLE salary_records ADD COLUMN "presentDays" INTEGER DEFAULT 22;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'salary_records' AND column_name = 'absentDays') THEN
        ALTER TABLE salary_records ADD COLUMN "absentDays" INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'salary_records' AND column_name = 'leaveDays') THEN
        ALTER TABLE salary_records ADD COLUMN "leaveDays" INTEGER DEFAULT 0;
    END IF;
END $$;

-- Update leave_requests table
DO $$
BEGIN
    -- Add documents column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leave_requests' AND column_name = 'documents') THEN
        ALTER TABLE leave_requests ADD COLUMN "documents" TEXT[] DEFAULT '{}';
    END IF;
    
    -- Add totalDays column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leave_requests' AND column_name = 'totalDays') THEN
        ALTER TABLE leave_requests ADD COLUMN "totalDays" INTEGER;
        -- Calculate totalDays for existing records
        UPDATE leave_requests 
        SET "totalDays" = EXTRACT(DAY FROM ("endDate" - "startDate")) + 1
        WHERE "totalDays" IS NULL;
    END IF;
END $$;

-- Create system_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS "system_settings" (
    "id" TEXT NOT NULL,
    "workingHoursStart" TEXT NOT NULL DEFAULT '09:00',
    "workingHoursEnd" TEXT NOT NULL DEFAULT '17:00',
    "lateThreshold" INTEGER NOT NULL DEFAULT 15,
    "overtimeThreshold" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    "weekendDays" TEXT[] DEFAULT ARRAY['SATURDAY', 'SUNDAY'],
    "holidayDates" TIMESTAMP(3)[],
    "companyName" TEXT NOT NULL DEFAULT 'Ruba Agencies',
    "companyAddress" TEXT,
    "companyPhone" TEXT,
    "companyEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- Insert default system settings if none exist
INSERT INTO "system_settings" ("id", "companyName")
SELECT 'default', 'Ruba Agencies'
WHERE NOT EXISTS (SELECT 1 FROM "system_settings");

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- Update enum values if needed
DO $$
BEGIN
    -- Check if CheckInMethod enum needs updating
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ADMIN_MARKED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'CheckInMethod')) THEN
        ALTER TYPE "CheckInMethod" ADD VALUE 'ADMIN_MARKED';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        -- Enum value already exists, do nothing
        NULL;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_attendance_user_date" ON "attendance_records"("userId", "date");
CREATE INDEX IF NOT EXISTS "idx_leave_requests_user_status" ON "leave_requests"("userId", "status");
CREATE INDEX IF NOT EXISTS "idx_salary_records_user_period" ON "salary_records"("userId", "year", "month");
CREATE INDEX IF NOT EXISTS "idx_notifications_user_read" ON "notifications"("userId", "isRead");

-- Update existing data to ensure consistency
UPDATE "attendance_records" SET "isManualEntry" = false WHERE "isManualEntry" IS NULL;
UPDATE "users" SET "isActive" = true WHERE "isActive" IS NULL;
UPDATE "salary_records" SET "isPaid" = false WHERE "isPaid" IS NULL;

COMMIT;
