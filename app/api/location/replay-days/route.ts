import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { istDayKey } from "@/lib/tracking-hours"

// Admin/HR: every employee and which days can be replayed — the stored daily
// routes plus today (which replays live from pings).
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || (session.user.role !== "ADMIN" && session.user.role !== "HR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const todayStr = istDayKey().toISOString().split("T")[0]

    const [users, routes] = await Promise.all([
      prisma.user.findMany({
        where: { role: "EMPLOYEE" },
        select: { id: true, firstName: true, lastName: true, employeeId: true, department: true },
        orderBy: { firstName: "asc" },
      }),
      prisma.dailyRoute.findMany({ select: { userId: true, date: true }, orderBy: { date: "desc" } }),
    ])

    const datesByUser = new Map<string, string[]>()
    for (const r of routes) {
      const d = r.date.toISOString().split("T")[0]
      const arr = datesByUser.get(r.userId)
      if (arr) arr.push(d)
      else datesByUser.set(r.userId, [d])
    }

    const employees = users.map((u) => {
      const stored = datesByUser.get(u.id) ?? []
      // Always offer today (replays live), newest first, de-duplicated.
      const dates = Array.from(new Set([todayStr, ...stored]))
      return { user: u, dates }
    })

    return NextResponse.json({ employees, today: todayStr })
  } catch (error) {
    console.error("Error listing replay days:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
