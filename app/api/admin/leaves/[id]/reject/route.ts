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

    const leaveRequest = await prisma.leaveRequest.update({
      where: { id: params.id },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        rejectionReason,
      },
    })

    return NextResponse.json({ request: leaveRequest })
  } catch (error) {
    console.error("Error rejecting leave request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
