import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { computeAndStoreToday } from "@/lib/daily-distance"

// Admin/HR: today's distance travelled per employee (also persists it so the
// travel-history page keeps a permanent daily record).
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || (session.user.role !== "ADMIN" && session.user.role !== "HR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const result = await computeAndStoreToday()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error computing distance stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
