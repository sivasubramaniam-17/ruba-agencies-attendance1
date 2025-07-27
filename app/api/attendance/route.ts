import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest) {
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

    const { action, location, method = "MANUAL" } = await request.json()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let attendanceRecord = await prisma.attendanceRecord.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: today,
        },
      },
    })

    const now = new Date()
    const workingHoursStart = new Date()
    workingHoursStart.setHours(9, 15, 0, 0) // 9:15 AM late threshold

    if (action === "checkin") {
      if (attendanceRecord?.checkInTime) {
        return NextResponse.json({ error: "Already checked in today" }, { status: 400 })
      }

      const isLate = now > workingHoursStart

      if (attendanceRecord) {
        attendanceRecord = await prisma.attendanceRecord.update({
          where: { id: attendanceRecord.id },
          data: {
            checkInTime: now,
            checkInLocation: location,
            checkInMethod: method,
            status: isLate ? "LATE" : "PRESENT",
            isLate,
          },
        })
      } else {
        attendanceRecord = await prisma.attendanceRecord.create({
          data: {
            userId: user.id,
            date: today,
            checkInTime: now,
            checkInLocation: location,
            checkInMethod: method,
            status: isLate ? "LATE" : "PRESENT",
            isLate,
          },
        })
      }

      return NextResponse.json({
        success: true,
        message: `Checked in successfully${isLate ? " (Late)" : ""}`,
        record: attendanceRecord,
      })
    } else if (action === "checkout") {
      if (!attendanceRecord?.checkInTime) {
        return NextResponse.json({ error: "Must check in first" }, { status: 400 })
      }

      if (attendanceRecord.checkOutTime) {
        return NextResponse.json({ error: "Already checked out today" }, { status: 400 })
      }

      const checkInTime = new Date(attendanceRecord.checkInTime)
      const totalHours = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)
      const overtimeHours = Math.max(0, totalHours - 8)

      const workingHoursEnd = new Date()
      workingHoursEnd.setHours(17, 0, 0, 0) // 5:00 PM
      const isEarlyLeave = now < workingHoursEnd

      attendanceRecord = await prisma.attendanceRecord.update({
        where: { id: attendanceRecord.id },
        data: {
          checkOutTime: now,
          checkOutLocation: location,
          checkOutMethod: method,
          totalHours: Math.round(totalHours * 100) / 100,
          overtimeHours: Math.round(overtimeHours * 100) / 100,
          isEarlyLeave,
        },
      })

      return NextResponse.json({
        success: true,
        message: "Checked out successfully",
        record: attendanceRecord,
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error processing attendance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
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

    const todayRecord = await prisma.attendanceRecord.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: today,
        },
      },
    })

    return NextResponse.json({ record: todayRecord })
  } catch (error) {
    console.error("Error fetching attendance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
