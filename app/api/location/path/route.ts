import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { istMidnightUtc, istDayKey } from "@/lib/tracking-hours"
import { buildRoutePath } from "@/lib/route-path"

// Admin/HR: an employee's replay-ready route (path + stops with arrive/leave
// times). Today is computed live from pings; past days are read from the compact
// daily_routes snapshot saved each night (raw pings are pruned after 24h).
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || (session.user.role !== "ADMIN" && session.user.role !== "HR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const dateParam = searchParams.get("date") // YYYY-MM-DD (IST day), optional
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

    const todayKey = istDayKey().toISOString().split("T")[0]
    const isToday = !dateParam || dateParam === todayKey

    if (isToday) {
      const pings = await prisma.locationPing.findMany({
        where: { userId, createdAt: { gte: istMidnightUtc() } },
        orderBy: { createdAt: "asc" },
        select: { latitude: true, longitude: true, accuracy: true, createdAt: true },
      })
      return NextResponse.json(buildRoutePath(pings))
    }

    // Past day → read the stored compact route.
    const dayKey = new Date(`${dateParam}T00:00:00.000Z`)
    const row = await prisma.dailyRoute.findUnique({
      where: { userId_date: { userId, date: dayKey } },
      select: { points: true, stops: true, startT: true, endT: true },
    })
    if (!row) return NextResponse.json({ points: [], stops: [], startT: null, endT: null })
    return NextResponse.json({
      points: row.points,
      stops: row.stops,
      startT: row.startT,
      endT: row.endT,
    })
  } catch (error) {
    console.error("Error building replay path:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
