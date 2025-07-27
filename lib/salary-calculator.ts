import { prisma } from "@/lib/prisma";
import { getWorkingDaysInMonth, isWeekend } from "./date-utils";

interface SalaryCalculation {
  baseSalary: number;
  workingDays: number;
  presentDays: number;
  absentDays: number; // Days with no record and no leave
  leaveDays: number; // Days with approved leave
  lateCount: number;
  totalLateMinutes: number;
  lateDeductions: number;
  leaveDeductions: number;
  absentDeductions: number;
  totalDeductions: number;
  totalSalary: number;
  hourlyRate: number;
  minuteRate: number;
  dailyRate: number;
  consecutiveLeaveDays: number;
}

export async function calculateSalary(
  userId: string,
  month: number,
  year: number,
  baseSalary: number
): Promise<SalaryCalculation> {
  // Get system settings
  const settings = await prisma.systemSettings.findFirst();
  if (!settings) {
    throw new Error("System settings not found");
  }

  // Calculate working days in month (excluding Sundays)
  const workingDays = getWorkingDaysInMonth(
    year,
    month,
    ["Sunday"],
    settings.holidayDates
  );

  // Calculate rates
  const dailyRate = baseSalary / workingDays;
  const hourlyRate = dailyRate / 8; // Assuming 8 working hours per day
  const minuteRate = hourlyRate / 60;

  // Get date range for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  // Get all necessary data in parallel
  const [attendanceRecords, leaveRequests] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        userId,
        status: "APPROVED",
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    }),
  ]);

  // Initialize counters
  let presentDays = 0;
  let absentDays = 0;
  let leaveDays = 0;
  let lateCount = 0;
  let totalLateMinutes = 0;
  let consecutiveLeaveDays = 0;
  let maxConsecutiveLeave = 0;

  // Process each day of the month
  for (let day = 1; day <= endDate.getDate(); day++) {
    const currentDate = new Date(year, month - 1, day);
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

    const dateStr = currentDate.toISOString().split("T")[0];
    const attendance = attendanceRecords.find(
      (record) => record.date.toISOString().split("T")[0] === dateStr
    );
    const leave = leaveRequests.find(
      (l) =>
        currentDate >= new Date(l.startDate) &&
        currentDate <= new Date(l.endDate)
    );

    // Skip Sundays - they are automatically non-working days with pay
    if (dayOfWeek === 0) {
      // Check if Sunday is part of a leave period (for consecutive leave calculation)
      if (leave) {
        consecutiveLeaveDays++;
        maxConsecutiveLeave = Math.max(
          maxConsecutiveLeave,
          consecutiveLeaveDays
        );
      } else {
        consecutiveLeaveDays = 0;
      }
      continue;
    }

    // Skip holidays
    if (
      settings.holidayDates.some(
        (holiday) =>
          holiday.getDate() === currentDate.getDate() &&
          holiday.getMonth() === currentDate.getMonth() &&
          holiday.getFullYear() === currentDate.getFullYear()
      )
    ) {
      continue;
    }

    if (attendance) {
      // Check attendance status
      if (attendance.status === "ABSENT") {
        // Explicitly marked as absent - count as absent day
        absentDays++;
        consecutiveLeaveDays = 0;
      } else {
        presentDays++;
        consecutiveLeaveDays = 0;

        // Check for late arrival
        if (attendance.isLate) {
          lateCount++;

          // Calculate late minutes if checkInTime exists
          if (attendance.checkInTime) {
            const expectedTime = new Date(currentDate);
            const [hours, minutes] = settings.workingHoursStart
              .split(":")
              .map(Number);
            expectedTime.setHours(hours, minutes, 0, 0);

            const lateMs =
              attendance.checkInTime.getTime() - expectedTime.getTime();
            const lateMinutes = Math.max(0, Math.floor(lateMs / (1000 * 60)));
            totalLateMinutes += lateMinutes;
          }
        }
      }
    } else if (leave) {
      // Approved leave
      leaveDays++;
      consecutiveLeaveDays++;
      maxConsecutiveLeave = Math.max(maxConsecutiveLeave, consecutiveLeaveDays);
    } else {
      // No attendance record and no leave - count as absent
      absentDays++;
      consecutiveLeaveDays = 0;
    }
  }

  // Calculate deductions
  const lateDeductions = totalLateMinutes * minuteRate;

  // Calculate leave deductions with special weekend rules
  let leaveDeductions = 0;
  let absentDeductions = absentDays * dailyRate;

  // Special rules for leave that spans weekends
  if (maxConsecutiveLeave > 0) {
    // If leave spans Friday-Sunday, deduct for all 3 days
    if (maxConsecutiveLeave >= 3) {
      leaveDeductions = maxConsecutiveLeave * dailyRate;
    }
    // If leave spans Saturday-Sunday, deduct for both days
    else if (maxConsecutiveLeave >= 2) {
      leaveDeductions = maxConsecutiveLeave * dailyRate;
    }
    // Regular leave deduction (1 day)
    else {
      leaveDeductions = leaveDays * dailyRate;
    }
  }

  const totalDeductions = lateDeductions + leaveDeductions + absentDeductions;
  const totalSalary = Math.max(0, baseSalary - totalDeductions);

  return {
    baseSalary,
    workingDays,
    presentDays,
    absentDays,
    leaveDays,
    lateCount,
    totalLateMinutes,
    lateDeductions,
    leaveDeductions,
    absentDeductions,
    totalDeductions,
    totalSalary,
    hourlyRate,
    dailyRate,
    minuteRate,
    consecutiveLeaveDays: maxConsecutiveLeave,
  };
}
