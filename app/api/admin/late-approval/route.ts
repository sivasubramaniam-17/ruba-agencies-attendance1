import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (
      !session?.user?.id ||
      (session.user.role !== "ADMIN" && session.user.role !== "HR" && session.user.role !== "MANAGER")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const where: any = {}

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
