import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const currentMonth = new Date()
    currentMonth.setDate(1)
    currentMonth.setHours(0, 0, 0, 0)

    const nextMonth = new Date(currentMonth)
    nextMonth.setMonth(nextMonth.getMonth() + 1)

    if (user.role === "ADMIN") {
      // Admin dashboard stats — run all independent queries concurrently
      const [
        totalEmployees,
        todayAttendance,
        pendingLeaves,
        salaryRecords,
        monthlyAttendance,
        employeeAttendance,
        systemSettings,
      ] = await Promise.all([
        prisma.user.count({
          where: { role: "EMPLOYEE" },
        }),
        prisma.attendanceRecord.findMany({
          where: {
            date: {
              gte: today,
              lt: tomorrow,
            },
          },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                employeeId: true,
              },
            },
          },
        }),
        prisma.leaveRequest.count({
          where: { status: "PENDING" },
        }),
        // Calculate total salary paid this month
        prisma.salaryRecord.findMany({
          where: {
            month: currentMonth.getMonth() + 1,
            year: currentMonth.getFullYear(),
          },
        }),
        // Calculate average attendance rate
        prisma.attendanceRecord.findMany({
          where: {
            date: {
              gte: currentMonth,
              lt: nextMonth,
            },
          },
        }),
        // Find top performer
        prisma.attendanceRecord.groupBy({
          by: ["userId"],
          where: {
            date: {
              gte: currentMonth,
              lt: nextMonth,
            },
            status: "PRESENT",
          },
          _count: {
            userId: true,
          },
          orderBy: [
            {
              _count: {
                userId: "desc",
              },
            },
            // Stable tie-breaker so the top performer doesn't change on refresh
            { userId: "asc" },
          ],
          take: 1,
        }),
        // Get system settings
        prisma.systemSettings.findFirst(),
      ])

      const presentToday = todayAttendance.filter((record) => record.status === "PRESENT").length
      const absentToday = totalEmployees - presentToday
      const lateToday = todayAttendance.filter(
        (record) => record.checkInTime && new Date(record.checkInTime).getHours() > 9,
      ).length

      const totalSalaryPaid = salaryRecords.reduce((sum, record) => sum + (record.totalSalary || 0), 0)

      const presentDays = monthlyAttendance.filter((record) => record.status === "PRESENT").length
      const totalPossibleDays = totalEmployees * new Date().getDate()
      const avgAttendanceRate = totalPossibleDays > 0 ? (presentDays / totalPossibleDays) * 100 : 0

      let topPerformer = "No data"
      if (employeeAttendance.length > 0) {
        const topEmployee = await prisma.user.findUnique({
          where: { id: employeeAttendance[0].userId },
          select: { firstName: true, lastName: true },
        })
        topPerformer = topEmployee ? `${topEmployee.firstName} ${topEmployee.lastName}` : "Unknown"
      }

      return NextResponse.json({
        stats: {
          totalEmployees,
          presentToday,
          absentToday,
          lateToday,
          pendingLeaves,
          totalSalaryPaid,
          avgAttendanceRate,
          topPerformer,
          onLeave: absentToday,
          totalSalary: totalSalaryPaid,
          lateArrivals: lateToday,
        },
        recentAttendance: todayAttendance.slice(0, 10),
        systemSettings,
      })
    } else {
      // Employee dashboard stats — run all independent queries concurrently
      const [
        todayAttendance,
        monthlyStats,
        attendanceBreakdown,
        pendingLeaves,
        totalLeavesTaken,
        recentAttendance,
        systemSettings,
      ] = await Promise.all([
        prisma.attendanceRecord.findUnique({
          where: {
            userId_date: {
              userId: user.id,
              date: today,
            },
          },
        }),
        prisma.attendanceRecord.aggregate({
          where: {
            userId: user.id,
            date: {
              gte: currentMonth,
              lt: nextMonth,
            },
          },
          _count: {
            id: true,
          },
          _sum: {
            totalHours: true,
            overtimeHours: true,
          },
        }),
        prisma.attendanceRecord.groupBy({
          by: ["status"],
          where: {
            userId: user.id,
            date: {
              gte: currentMonth,
              lt: nextMonth,
            },
          },
          _count: {
            status: true,
          },
        }),
        prisma.leaveRequest.count({
          where: {
            userId: user.id,
            status: "PENDING",
          },
        }),
        prisma.leaveRequest.aggregate({
          where: {
            userId: user.id,
            status: "APPROVED",
            startDate: {
              gte: new Date(new Date().getFullYear(), 0, 1),
            },
          },
          _sum: {
            totalDays: true,
          },
        }),
        prisma.attendanceRecord.findMany({
          where: {
            userId: user.id,
          },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                employeeId: true,
              },
            },
          },
          orderBy: { date: "desc" },
          take: 5,
        }),
        prisma.systemSettings.findFirst(),
      ])

      const leaveBalance = Math.max(0, 30 - (totalLeavesTaken._sum.totalDays || 0))

      return NextResponse.json({
        todayAttendance,
        monthlyStats: {
          totalDays: monthlyStats._count.id || 0,
          totalHours: monthlyStats._sum.totalHours || 0,
          overtimeHours: monthlyStats._sum.overtimeHours || 0,
        },
        attendanceBreakdown: attendanceBreakdown.reduce(
          (acc, item) => {
            acc[item.status] = item._count.status
            return acc
          },
          {} as Record<string, number>,
        ),
        pendingLeaves,
        leaveBalance,
        recentAttendance,
        systemSettings,
      })
    }
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
