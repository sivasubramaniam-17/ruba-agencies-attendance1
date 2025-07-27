import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { id: true },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const currentYear = new Date().getFullYear()
  const startOfYear = new Date(currentYear, 0, 1)
  const endOfYear = new Date(currentYear, 11, 31)

  const leaveRequests = await prisma.leaveRequest.findMany({
    where: {
      userId: user.id,
      startDate: {
        gte: startOfYear,
        lte: endOfYear,
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ leaveRequests })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { id: true },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const data = await request.json()
  const { leaveType, startDate, endDate, reason, isInformed } = data

  try {
    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        userId: user.id,
        leaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalDays: Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1,
        reason,
        isInformed,
        status: "PENDING",
      },
    })

    return NextResponse.json({ leaveRequest })
  } catch (error) {
    console.error("Error creating leave request:", error)
    return NextResponse.json({ error: "Failed to create leave request" }, { status: 500 })
  }
}