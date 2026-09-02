import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { istMidnightUtc } from "@/lib/tracking-hours"

// Max speed between two kept points before we treat it as a GPS glitch.
const MAX_SPEED_MPS = 55
const MAX_ACCURACY_M = 50
const MAX_POINTS = 600 // cap so replay stays light on the client

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

// Admin/HR: an employee's cleaned, time-ordered path for today (last 24h — pings
// older than that are pruned), so the map can replay where they went.
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || (session.user.role !== "ADMIN" && session.user.role !== "HR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = new URL(request.url).searchParams.get("userId")
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

    const pings = await prisma.locationPing.findMany({
      where: { userId, createdAt: { gte: istMidnightUtc() } },
      orderBy: { createdAt: "asc" },
      select: { latitude: true, longitude: true, accuracy: true, createdAt: true },
    })

    // Drop noisy fixes and teleport outliers so the replayed line is clean.
    const kept: { lat: number; lng: number; t: number }[] = []
    for (const p of pings) {
      if (p.accuracy != null && p.accuracy > MAX_ACCURACY_M) continue
      const prev = kept[kept.length - 1]
      const t = p.createdAt.getTime()
      if (prev) {
        const dist = haversineMeters(prev.lat, prev.lng, p.latitude, p.longitude)
        const dt = Math.max(1, (t - prev.t) / 1000)
        if (dist / dt > MAX_SPEED_MPS) continue // impossible jump — skip
      }
      kept.push({ lat: p.latitude, lng: p.longitude, t })
    }

    // Detect stops: a run of points that stays within a small radius for a while.
    // Each becomes "arrived HH:MM, left HH:MM, stayed N min" on the replay.
    const STOP_RADIUS_M = 60
    const STOP_MIN_MS = 5 * 60 * 1000 // stayed at least 5 minutes
    const stops: { lat: number; lng: number; arrive: number; leave: number; minutes: number }[] = []
    let i = 0
    while (i < kept.length) {
      let j = i + 1
      let sumLat = kept[i].lat
      let sumLng = kept[i].lng
      while (j < kept.length && haversineMeters(kept[i].lat, kept[i].lng, kept[j].lat, kept[j].lng) <= STOP_RADIUS_M) {
        sumLat += kept[j].lat
        sumLng += kept[j].lng
        j++
      }
      const dur = kept[j - 1].t - kept[i].t
      if (dur >= STOP_MIN_MS) {
        const n = j - i
        stops.push({
          lat: sumLat / n,
          lng: sumLng / n,
          arrive: kept[i].t,
          leave: kept[j - 1].t,
          minutes: Math.round(dur / 60000),
        })
        i = j
      } else {
        i++
      }
    }

    // Downsample the path evenly if very long, always keeping the last point.
    let points = kept
    if (kept.length > MAX_POINTS) {
      const step = Math.ceil(kept.length / MAX_POINTS)
      points = kept.filter((_, idx) => idx % step === 0)
      if (points[points.length - 1] !== kept[kept.length - 1]) points.push(kept[kept.length - 1])
    }

    const startT = kept.length ? kept[0].t : null
    const endT = kept.length ? kept[kept.length - 1].t : null
    return NextResponse.json({ points, stops, startT, endT })
  } catch (error) {
    console.error("Error building replay path:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
