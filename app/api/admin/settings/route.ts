import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !["ADMIN", "HR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Try to get existing settings
    let settings = await prisma.systemSettings.findFirst()

    // If no settings exist, create default settings
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          workingHoursStart: "09:00",
          workingHoursEnd: "17:00",
          lateThreshold: 15,
          overtimeThreshold: 8.0,
          lateDeductionRate: 50.0,
          leaveDeductionRate: 100.0,
          autoDeductLateArrival: true,
          autoDeductLeave: true,
          weekendDays: ["SUNDAY"],
          companyName: "Ruba Agencies",
        },
      })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()
    console.log("Received settings data:", data)

    const {
      workingHoursStart,
      workingHoursEnd,
      lateThreshold,
      overtimeThreshold,
      autoDeductLateArrival,
      autoDeductLeave,
    } = data

    // Validate required fields
    if (!workingHoursStart || !workingHoursEnd) {
      return NextResponse.json({ error: "Working hours are required" }, { status: 400 })
    }

    // Check if settings exist
    const existingSettings = await prisma.systemSettings.findFirst()
    console.log("Existing settings:", existingSettings)

    let settings
    if (existingSettings) {
      // Update existing settings
      settings = await prisma.systemSettings.update({
        where: { id: existingSettings.id },
        data: {
          workingHoursStart: workingHoursStart.toString(),
          workingHoursEnd: workingHoursEnd.toString(),
          lateThreshold: Number.parseInt(lateThreshold?.toString() || "15"),
          overtimeThreshold: Number.parseFloat(overtimeThreshold?.toString() || "8.0"),
          autoDeductLateArrival: Boolean(autoDeductLateArrival),
          autoDeductLeave: Boolean(autoDeductLeave),
          updatedAt: new Date(),
        },
      })
    } else {
      // Create new settings
      settings = await prisma.systemSettings.create({
        data: {
          workingHoursStart: workingHoursStart.toString(),
          workingHoursEnd: workingHoursEnd.toString(),
          lateThreshold: Number.parseInt(lateThreshold?.toString() || "15"),
          overtimeThreshold: Number.parseFloat(overtimeThreshold?.toString() || "8.0"),
          autoDeductLateArrival: Boolean(autoDeductLateArrival),
          autoDeductLeave: Boolean(autoDeductLeave),
          weekendDays: ["SUNDAY"],
          companyName: "Ruba Agencies",
        },
      })
    }

    console.log("Updated settings:", settings)
    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Error updating settings:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
