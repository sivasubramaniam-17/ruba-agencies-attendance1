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

    const lateRequest = await prisma.lateApprovalRequest.update({
      where: { id: params.id },
      data: {
        status: "APPROVED",
        approvedBy: session.user.id,
        approvedAt: new Date(),
      },
      include: {
        user: true,
      },
    })

    // Create notification for the employee
    await prisma.notification.create({
      data: {
        userId: lateRequest.userId,
        title: "Late Approval Request Approved",
        message: `Your late arrival request for ${lateRequest.date.toDateString()} has been approved. No salary deduction will be applied.`,
        type: "SUCCESS",
      },
    })

    return NextResponse.json({ request: lateRequest })
  } catch (error) {
    console.error("Error approving late request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
