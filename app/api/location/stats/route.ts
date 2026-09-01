import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

// Distance a point can jump between fixes before we treat it as a GPS glitch.
const MAX_SPEED_MPS = 55 // ~200 km/h

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

// Admin/HR: total distance each employee has travelled TODAY (km), from their
// location pings — GPS-glitch jumps are filtered out so the number is realistic.
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || (session.user.role !== "ADMIN" && session.user.role !== "HR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const pings = await prisma.locationPing.findMany({
      where: { createdAt: { gte: todayStart } },
      orderBy: { createdAt: "asc" },
      select: { userId: true, latitude: true, longitude: true, createdAt: true },
    })

    // Group by user and sum plausible segment distances.
    const byUser = new Map<string, typeof pings>()
    for (const p of pings) {
      const arr = byUser.get(p.userId)
      if (arr) arr.push(p)
      else byUser.set(p.userId, [p])
    }

    const distanceByUser: Record<string, number> = {}
    let teamMeters = 0
    for (const [userId, arr] of byUser) {
      let meters = 0
      let prev: (typeof arr)[number] | null = null
      for (const p of arr) {
        if (prev) {
          const d = haversineMeters(prev.latitude, prev.longitude, p.latitude, p.longitude)
          const dt = Math.max(1, (p.createdAt.getTime() - prev.createdAt.getTime()) / 1000)
          if (d / dt <= MAX_SPEED_MPS) meters += d // skip teleport outliers
        }
        prev = p
      }
      const km = Math.round((meters / 1000) * 10) / 10
      distanceByUser[userId] = km
      teamMeters += meters
    }

    return NextResponse.json({
      distanceByUser,
      teamKm: Math.round((teamMeters / 1000) * 10) / 10,
    })
  } catch (error) {
    console.error("Error computing distance stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
