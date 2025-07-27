import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { getMonthDetails } from "@/lib/date-utils"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !["ADMIN", "HR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month")
    const year = searchParams.get("year")

    if (!month || !year) {
      return NextResponse.json({ error: "Month and year are required" }, { status: 400 })
    }

    const monthDetails = getMonthDetails(Number.parseInt(year), Number.parseInt(month))

    return NextResponse.json({
      month: Number.parseInt(month),
      year: Number.parseInt(year),
      ...monthDetails,
    })
  } catch (error) {
    console.error("Error fetching working days:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
