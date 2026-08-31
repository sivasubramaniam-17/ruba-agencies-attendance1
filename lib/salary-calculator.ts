import { prisma } from "@/lib/prisma";
import { getWorkingDaysInMonth, isWeekend } from "./date-utils";

interface SalaryCalculation {
  baseSalary: number;
  workingDays: number;
  presentDays: number;
  absentDays: number; // Days with no record and no leave
  leaveDays: number; // Days with approved leave
  rejectedLeaveDays: number; // Days with rejected leave
  lateCount: number;
  totalLateMinutes: number;
  lateDeductions: number;
  leaveDeductions: number;
  absentDeductions: number;
  sandwichDays: number;
  sandwichDeductions: number;
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

  // Calculate rates. Derive hours/day from the configured working hours so that
  // "1 hour late" deducts exactly one hour of that day's pay.
  const dailyRate = baseSalary / workingDays;
  const [startH, startM] = settings.workingHoursStart.split(":").map(Number);
  const [endH, endM] = settings.workingHoursEnd.split(":").map(Number);
  const hoursPerDay = Math.max(1, (endH * 60 + endM - (startH * 60 + startM)) / 60);
  const hourlyRate = dailyRate / hoursPerDay;
  const minuteRate = hourlyRate / 60;

  // Get date range for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  // Get all necessary data in parallel
  const [attendanceRecords, approvedLeaveRequests, rejectedLeaveRequests] = await Promise.all([
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
    prisma.leaveRequest.findMany({
      where: {
        userId,
        status: "REJECTED",
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
  let rejectedLeaveDays = 0;
  let lateCount = 0;
  let totalLateMinutes = 0;
  let consecutiveLeaveDays = 0;
  let maxConsecutiveLeave = 0;
  // Tracks which working days were unapproved absences (for the sandwich rule).
  const absentByDay: Record<number, boolean> = {};
  const now = new Date();

  // Process each day of the month
  for (let day = 1; day <= endDate.getDate(); day++) {
    const currentDate = new Date(year, month - 1, day);
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Don't count days that haven't happened yet (calculating a partial/current
    // month) — a future day is neither present nor absent, so it can't deduct.
    if (new Date(year, month - 1, day, 23, 59, 59, 999) > now) continue;

    // Match everything on the plain calendar date (YYYY-MM-DD) to avoid timezone
    // shifts — attendance AND leave dates are stored at UTC midnight.
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const attendance = attendanceRecords.find(
      (record) => record.date.toISOString().split("T")[0] === dateStr
    );
    const dayWithinLeave = (l: { startDate: Date; endDate: Date }) => {
      const s = l.startDate.toISOString().split("T")[0];
      const e = l.endDate.toISOString().split("T")[0];
      return dateStr >= s && dateStr <= e;
    };
    const approvedLeave = approvedLeaveRequests.find(dayWithinLeave);
    const rejectedLeave = rejectedLeaveRequests.find(dayWithinLeave);

    // Skip Sundays - they are automatically non-working days with pay
    if (dayOfWeek === 0) {
      // Check if Sunday is part of a leave period (for consecutive leave calculation)
      if (approvedLeave) {
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
        absentByDay[day] = true;
        consecutiveLeaveDays = 0;
      } else {
        presentDays++;
        consecutiveLeaveDays = 0;

        // Late arrival: count every minute after the configured start time
        // (from check-in), regardless of the stored flag, so the deduction is
        // always accurate — e.g. checking in 1 hour late adds 60 late minutes.
        if (attendance.checkInTime) {
          const expectedTime = new Date(currentDate);
          expectedTime.setHours(startH, startM, 0, 0);
          const lateMs = attendance.checkInTime.getTime() - expectedTime.getTime();
          const lateMinutes = Math.max(0, Math.floor(lateMs / (1000 * 60)));
          if (lateMinutes > 0) {
            lateCount++;
            totalLateMinutes += lateMinutes;
          }
        }
      }
    } else if (approvedLeave) {
      // Approved leave - no deduction
      leaveDays++;
      consecutiveLeaveDays++;
      maxConsecutiveLeave = Math.max(maxConsecutiveLeave, consecutiveLeaveDays);
    } else if (rejectedLeave) {
      // Rejected leave - count as absent
      rejectedLeaveDays++;
      absentDays++;
      absentByDay[day] = true;
      consecutiveLeaveDays = 0;
    } else {
      // No attendance record and no leave - count as absent
      absentDays++;
      absentByDay[day] = true;
      consecutiveLeaveDays = 0;
    }
  }

  // Adjacent-absence rule: a Sunday is deducted if the working day immediately
  // BEFORE it (usually Saturday) OR the working day immediately AFTER it (usually
  // Monday) was an unapproved absence. So an unapproved absence next to a Sunday
  // costs that Sunday's pay too.
  const holidayKeys = new Set(
    settings.holidayDates.map((h) => `${h.getFullYear()}-${h.getMonth()}-${h.getDate()}`)
  );
  const isNonWorkingDay = (d: Date) =>
    d.getDay() === 0 || holidayKeys.has(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  // Walk in `step` direction to the nearest working day; true only if it was an absence.
  const nearestWorkingDayIsAbsent = (fromDay: number, step: number): boolean => {
    for (let d = fromDay + step; d >= 1 && d <= endDate.getDate(); d += step) {
      if (!isNonWorkingDay(new Date(year, month - 1, d))) return absentByDay[d] === true;
    }
    return false; // neighbour falls outside this month
  };
  let sandwichDays = 0;
  for (let day = 1; day <= endDate.getDate(); day++) {
    const d = new Date(year, month - 1, day);
    if (d.getDay() !== 0) continue; // only Sundays are normally paid days off
    if (nearestWorkingDayIsAbsent(day, -1) || nearestWorkingDayIsAbsent(day, +1)) {
      sandwichDays++;
    }
  }
  const sandwichDeductions = sandwichDays * dailyRate;

  // Calculate deductions. Late arrival is deducted proportionally
  // (1 hour late = 1 hour's pay) when auto-deduction is enabled in settings.
  const lateDeductions = settings.autoDeductLateArrival ? totalLateMinutes * minuteRate : 0;
  const absentDeductions = absentDays * dailyRate;
  
  // Approved leave never reduces salary — including any weekend it spans.
  // (Only UNAPPROVED absences drive the absent and Sunday-cut deductions above.)
  const leaveDeductions = 0;

  // Round each money value to 2 decimals (paise), then derive the total from the
  // rounded parts so the breakdown always adds up exactly (no lost/extra paise).
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const rLate = round2(lateDeductions);
  const rAbsent = round2(absentDeductions);
  const rLeave = round2(leaveDeductions);
  const rSandwich = round2(sandwichDeductions);
  const rTotalDeductions = round2(rLate + rAbsent + rLeave + rSandwich);
  const rTotalSalary = round2(Math.max(0, baseSalary - rTotalDeductions));

  return {
    baseSalary,
    workingDays,
    presentDays,
    absentDays,
    leaveDays,
    rejectedLeaveDays,
    lateCount,
    totalLateMinutes,
    lateDeductions: rLate,
    leaveDeductions: rLeave,
    absentDeductions: rAbsent,
    sandwichDays,
    sandwichDeductions: rSandwich,
    totalDeductions: rTotalDeductions,
    totalSalary: rTotalSalary,
    hourlyRate: round2(hourlyRate),
    dailyRate: round2(dailyRate),
    minuteRate: round2(minuteRate),
    consecutiveLeaveDays: maxConsecutiveLeave,
  };
}