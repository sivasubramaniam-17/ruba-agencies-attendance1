import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const where: any = {
      userId: user.id,
    }

    if (status && status !== "ALL") {
      where.status = status
    }

    const requests = await prisma.lateApprovalRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            employeeId: true,
            department: true,
          },
        },
      },
    })

    return NextResponse.json({ requests })
  } catch (error) {
    console.error("Error fetching late approval requests:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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

    const { date, lateMinutes, reason } = await request.json()

    if (!date || !lateMinutes || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const requestDate = new Date(date)
    const today = new Date()
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    if (requestDate < thirtyDaysAgo) {
      return NextResponse.json({ error: "Cannot request approval for dates older than 30 days" }, { status: 400 })
    }

    if (requestDate > today) {
      return NextResponse.json({ error: "Cannot request approval for future dates" }, { status: 400 })
    }

    // Check if request already exists for this date
    const existingRequest = await prisma.lateApprovalRequest.findFirst({
      where: {
        userId: user.id,
        date: requestDate,
      },
    })

    if (existingRequest) {
      return NextResponse.json({ error: "Late approval request already exists for this date" }, { status: 400 })
    }

    const lateRequest = await prisma.lateApprovalRequest.create({
      data: {
        userId: user.id,
        date: requestDate,
        lateMinutes: Number.parseInt(lateMinutes),
        reason,
        status: "PENDING",
      },
    })

    // Create notification for admins
    const admins = await prisma.user.findMany({
      where: {
        OR: [{ role: "ADMIN" }, { role: "HR" }],
      },
    })

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: "New Late Approval Request",
          message: `${user.firstName} ${user.lastName} has requested approval for being ${lateMinutes} minutes late on ${requestDate.toDateString()}.`,
          type: "INFO",
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: "Late approval request submitted successfully",
      request: lateRequest,
    })
  } catch (error) {
    console.error("Error creating late approval request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
