/**
 * Date utilities for working days calculation and salary computations
 * These functions work on both client and server side
 */

export interface MonthDetails {
  year: number
  month: number
  monthName: string
  totalDays: number
  workingDays: number
  sundays: number
}

export interface SalaryRates {
  hourlyRate: number
  minuteRate: number
  dailyRate: number
}

/**
 * Get working days in a month (excludes only Sundays)
 * Saturday is considered a working day
 */

/**
 * Calculate salary rates based on base salary and working parameters
 */
export function calculateRates(baseSalary: number, workingDays: number, dailyHours: number): SalaryRates {
  const totalHours = workingDays * dailyHours
  const hourlyRate = baseSalary / totalHours
  const minuteRate = hourlyRate / 60
  const dailyRate = baseSalary / workingDays

  return {
    hourlyRate,
    minuteRate,
    dailyRate,
  }
}

/**
 * Get working days details for upcoming months
 */
export function getUpcomingMonthsWorkingDays(count = 6): MonthDetails[] {
  const months: MonthDetails[] = []
  const currentDate = new Date()

  for (let i = 0; i < count; i++) {
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1)
    const year = targetDate.getFullYear()
    const month = targetDate.getMonth() + 1

    months.push(getMonthDetails(year, month))
  }

  return months
}

/**
 * Calculate late deduction amount
 */
export function calculateLateDeduction(lateMinutes: number, graceMinutes: number, minuteRate: number): number {
  if (lateMinutes <= graceMinutes) {
    return 0
  }

  const deductibleMinutes = lateMinutes - graceMinutes
  return deductibleMinutes * minuteRate
}

/**
 * Calculate leave deduction amount
 */
export function calculateLeaveDeduction(leaveDays: number, dailyRate: number): number {
  return leaveDays * dailyRate
}

/**
 * Get current month and year
 */


/**
 * Format time from minutes to HH:MM format
 */
export function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
}

/**
 * Calculate working hours between two times
 */
export function calculateWorkingHours(startTime: string, endTime: string): number {
  const start = new Date(`2000-01-01T${startTime}:00`)
  const end = new Date(`2000-01-01T${endTime}:00`)
  const diffMs = end.getTime() - start.getTime()
  return Math.max(0, diffMs / (1000 * 60 * 60))
}

export function getWorkingDaysInMonth(
  year: number,
  month: number,
  weekendDays: string[] = ['Sunday'],
  holidays: Date[] = []
): number {
  const daysInMonth = new Date(year, month, 0).getDate()
  let workingDays = 0

  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month - 1, day)
    if (!isWeekend(currentDate, weekendDays)) {
      // Check if it's a holiday
      const isHoliday = holidays.some(holiday => 
        holiday.getDate() === currentDate.getDate() && 
        holiday.getMonth() === currentDate.getMonth() && 
        holiday.getFullYear() === currentDate.getFullYear()
      )
      if (!isHoliday) {
        workingDays++
      }
    }
  }

  return workingDays
}

export function isWeekend(date: Date, weekendDays: string[] = ['Sunday']): boolean {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayName = dayNames[date.getDay()]
  return weekendDays.includes(dayName)
}

export function getMonthDetails(year: number, month: number) {
  const date = new Date(year, month - 1, 1)
  const monthName = date.toLocaleString('default', { month: 'long' })
  const totalDays = new Date(year, month, 0).getDate()
  
  return {
    monthName,
    year,
    totalDays,
  }
}

export function getCurrentMonthYear() {
  const now = new Date()
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  }
}