import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { computeAndStoreToday } from "@/lib/daily-distance"

// Admin/HR: stored daily distance per employee. Optional ?from=YYYY-MM-DD&to=YYYY-MM-DD
// (defaults to the last 30 days).
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || (session.user.role !== "ADMIN" && session.user.role !== "HR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Keep today's row current before reading history.
    await computeAndStoreToday()

    const { searchParams } = new URL(request.url)
    const fromParam = searchParams.get("from")
    const toParam = searchParams.get("to")

    let from: Date
    if (fromParam) {
      from = new Date(`${fromParam}T00:00:00.000Z`)
    } else {
      from = new Date()
      from.setUTCDate(from.getUTCDate() - 30)
      from.setUTCHours(0, 0, 0, 0)
    }
    const to = toParam ? new Date(`${toParam}T23:59:59.999Z`) : new Date()

    const records = await prisma.dailyDistance.findMany({
      where: { date: { gte: from, lte: to } },
      orderBy: { date: "desc" },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, employeeId: true, department: true } },
      },
    })

    type Row = {
      user: (typeof records)[number]["user"]
      days: { date: string; km: number }[]
      totalKm: number
    }
    const byUser = new Map<string, Row>()
    for (const r of records) {
      let row = byUser.get(r.user.id)
      if (!row) {
        row = { user: r.user, days: [], totalKm: 0 }
        byUser.set(r.user.id, row)
      }
      row.days.push({ date: r.date.toISOString().split("T")[0], km: r.distanceKm })
      row.totalKm += r.distanceKm
    }

    const employees = Array.from(byUser.values())
      .map((e) => ({ ...e, totalKm: Math.round(e.totalKm * 10) / 10 }))
      .sort((a, b) => b.totalKm - a.totalKm)

    return NextResponse.json({ employees })
  } catch (error) {
    console.error("Error fetching travel history:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
