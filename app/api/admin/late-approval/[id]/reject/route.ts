import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (
      !session?.user?.id ||
      (session.user.role !== "ADMIN" && session.user.role !== "HR" && session.user.role !== "MANAGER")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { rejectionReason } = body

    const lateRequest = await prisma.lateApprovalRequest.update({
      where: { id: params.id },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        rejectionReason,
      },
      include: {
        user: true,
      },
    })

    // Create notification for the employee
    await prisma.notification.create({
      data: {
        userId: lateRequest.userId,
        title: "Late Approval Request Rejected",
        message: `Your late arrival request for ${lateRequest.date.toDateString()} has been rejected. Reason: ${rejectionReason}`,
        type: "ERROR",
      },
    })

    return NextResponse.json({ request: lateRequest })
  } catch (error) {
    console.error("Error rejecting late request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
