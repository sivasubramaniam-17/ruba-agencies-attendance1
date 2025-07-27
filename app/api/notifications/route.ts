import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")

    const skip = (page - 1) * limit

    // Get recent activities for notifications
    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0))

    // Get today's attendance for notifications
    const todayAttendance = await prisma.attendanceRecord.findMany({
      where: {
        date: {
          gte: startOfDay,
          lt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000),
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
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    // Get pending leave requests
    const pendingLeaves = await prisma.leaveRequest.findMany({
      where: { status: "PENDING" },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    })

    // Create notification objects
    const notifications = [
      ...todayAttendance.map((record) => ({
        id: `attendance-${record.id}`,
        type: "attendance",
        title: "Attendance Update",
        message: `${record.user.firstName} ${record.user.lastName} ${record.checkInTime ? "checked in" : "checked out"}`,
        timestamp: record.updatedAt,
        read: false,
        data: record,
      })),
      ...pendingLeaves.map((leave) => ({
        id: `leave-${leave.id}`,
        type: "leave",
        title: "Leave Request",
        message: `${leave.user.firstName} ${leave.user.lastName} requested ${leave.leaveType.toLowerCase()} leave`,
        timestamp: leave.createdAt,
        read: false,
        data: leave,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({
      notifications: notifications.slice(skip, skip + limit),
      pagination: {
        page,
        limit,
        total: notifications.length,
        pages: Math.ceil(notifications.length / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
