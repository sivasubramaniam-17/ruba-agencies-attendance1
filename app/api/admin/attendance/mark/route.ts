import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || (session.user.role !== "ADMIN" && session.user.role !== "HR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 })
    }

    const { employeeId, date, status, checkInTime, checkOutTime, notes } = await request.json()

    // Find the employee
    const employee = await prisma.user.findUnique({
      where: { employeeId },
    })

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    const attendanceDate = new Date(date)
    attendanceDate.setHours(0, 0, 0, 0)

    // Calculate total hours if both check-in and check-out times are provided
    let totalHours = null
    let overtimeHours = null
    if (checkInTime && checkOutTime) {
      const checkIn = new Date(`${date}T${checkInTime}`)
      const checkOut = new Date(`${date}T${checkOutTime}`)
      totalHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)
      overtimeHours = Math.max(0, totalHours - 8)
    }

    // Check if attendance record already exists
    const existingRecord = await prisma.attendanceRecord.findUnique({
      where: {
        userId_date: {
          userId: employee.id,
          date: attendanceDate,
        },
      },
    })

    let attendanceRecord
    if (existingRecord) {
      // Update existing record
      attendanceRecord = await prisma.attendanceRecord.update({
        where: { id: existingRecord.id },
        data: {
          status,
          checkInTime: checkInTime ? new Date(`${date}T${checkInTime}`) : null,
          checkOutTime: checkOutTime ? new Date(`${date}T${checkOutTime}`) : null,
          totalHours,
      
          notes,
          markedBy: admin.id,
          isManualEntry: true,
          checkInMethod: "ADMIN_MARKED",
          checkOutMethod: "ADMIN_MARKED",
          isLate: status === "LATE",
          updatedAt: new Date(),
        },
      })
    } else {
      // Create new record
      attendanceRecord = await prisma.attendanceRecord.create({
        data: {
          userId: employee.id,
          date: attendanceDate,
          status,
          checkInTime: checkInTime ? new Date(`${date}T${checkInTime}`) : null,
          checkOutTime: checkOutTime ? new Date(`${date}T${checkOutTime}`) : null,
          totalHours,
      
          notes,
          markedBy: admin.id,
          isManualEntry: true,
          checkInMethod: "ADMIN_MARKED",
          checkOutMethod: "ADMIN_MARKED",
          isLate: status === "LATE",
        },
      })
    }

    // Create notification for the employee
    await prisma.notification.create({
      data: {
        userId: employee.id,
        title: "Attendance Marked",
        message: `Your attendance for ${attendanceDate.toDateString()} has been marked as ${status} by admin.`,
        type: "INFO",
      },
    })

    return NextResponse.json({
      success: true,
      message: "Attendance marked successfully",
      record: attendanceRecord,
    })
  } catch (error) {
    console.error("Error marking attendance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
