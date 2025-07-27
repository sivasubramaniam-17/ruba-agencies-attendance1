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
      // Admin dashboard stats
      const totalEmployees = await prisma.user.count({
        where: { role: "EMPLOYEE" },
      })

      const todayAttendance = await prisma.attendanceRecord.findMany({
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
      })

      const presentToday = todayAttendance.filter((record) => record.status === "PRESENT").length
      const absentToday = totalEmployees - presentToday
      const lateToday = todayAttendance.filter(
        (record) => record.checkInTime && new Date(record.checkInTime).getHours() > 9,
      ).length

      const pendingLeaves = await prisma.leaveRequest.count({
        where: { status: "PENDING" },
      })

      // Calculate total salary paid this month
      const salaryRecords = await prisma.salaryRecord.findMany({
        where: {
          month: currentMonth.getMonth() + 1,
          year: currentMonth.getFullYear(),
        },
      })
      const totalSalaryPaid = salaryRecords.reduce((sum, record) => sum + (record.totalSalary || 0), 0)

      // Calculate average attendance rate
      const monthlyAttendance = await prisma.attendanceRecord.findMany({
        where: {
          date: {
            gte: currentMonth,
            lt: nextMonth,
          },
        },
      })

      const presentDays = monthlyAttendance.filter((record) => record.status === "PRESENT").length
      const totalPossibleDays = totalEmployees * new Date().getDate()
      const avgAttendanceRate = totalPossibleDays > 0 ? (presentDays / totalPossibleDays) * 100 : 0

      // Find top performer
      const employeeAttendance = await prisma.attendanceRecord.groupBy({
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
        orderBy: {
          _count: {
            userId: "desc",
          },
        },
        take: 1,
      })

      let topPerformer = "No data"
      if (employeeAttendance.length > 0) {
        const topEmployee = await prisma.user.findUnique({
          where: { id: employeeAttendance[0].userId },
          select: { firstName: true, lastName: true },
        })
        topPerformer = topEmployee ? `${topEmployee.firstName} ${topEmployee.lastName}` : "Unknown"
      }

      // Get system settings
      const systemSettings = await prisma.systemSettings.findFirst()

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
      // Employee dashboard stats
      const todayAttendance = await prisma.attendanceRecord.findUnique({
        where: {
          userId_date: {
            userId: user.id,
            date: today,
          },
        },
      })

      const monthlyStats = await prisma.attendanceRecord.aggregate({
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
      })

      const attendanceBreakdown = await prisma.attendanceRecord.groupBy({
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
      })

      const pendingLeaves = await prisma.leaveRequest.count({
        where: {
          userId: user.id,
          status: "PENDING",
        },
      })

      const totalLeavesTaken = await prisma.leaveRequest.aggregate({
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
      })

      const leaveBalance = Math.max(0, 30 - (totalLeavesTaken._sum.totalDays || 0))

      const recentAttendance = await prisma.attendanceRecord.findMany({
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
      })

      const systemSettings = await prisma.systemSettings.findFirst()

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
