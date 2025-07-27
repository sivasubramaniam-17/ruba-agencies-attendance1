-- AlterTable
ALTER TABLE "users" ADD COLUMN     "annualLeaveBalance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "casualLeaveBalance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sickLeaveBalance" INTEGER NOT NULL DEFAULT 0;
