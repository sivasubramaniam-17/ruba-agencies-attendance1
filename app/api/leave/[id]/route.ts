import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { leaveType, startDate, endDate, reason, documents } = body

    // Check if the leave request belongs to the user
    const existingRequest = await prisma.leaveRequest.findUnique({
      where: { id: params.id },
    })

    if (!existingRequest || existingRequest.userId !== session.user.id) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
    }

    if (existingRequest.status !== "PENDING") {
      return NextResponse.json({ error: "Cannot edit approved or rejected leave requests" }, { status: 400 })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const leaveRequest = await prisma.leaveRequest.update({
      where: { id: params.id },
      data: {
        leaveType,
        startDate: start,
        endDate: end,
        totalDays,
        reason,
        documents: documents || [],
      },
    })

    return NextResponse.json({ request: leaveRequest })
  } catch (error) {
    console.error("Error updating leave request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const existingRequest = await prisma.leaveRequest.findUnique({
      where: { id: params.id },
    })

    if (!existingRequest || existingRequest.userId !== session.user.id) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
    }

    if (existingRequest.status !== "PENDING") {
      return NextResponse.json({ error: "Cannot delete approved or rejected leave requests" }, { status: 400 })
    }

    await prisma.leaveRequest.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "Leave request deleted successfully" })
  } catch (error) {
    console.error("Error deleting leave request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
