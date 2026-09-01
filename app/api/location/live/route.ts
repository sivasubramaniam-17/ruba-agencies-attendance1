import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

// How recently an employee must have pinged to count as "live" on the map.
// Generous enough to survive brief tab-switches / throttled background timers.
const ACTIVE_WINDOW_MS = 5 * 60 * 1000 // 5 minutes
// How much of the recent path (breadcrumb trail) to show.
const TRAIL_WINDOW_MS = 30 * 60 * 1000 // 30 minutes
// Cap points per trail to keep the payload light.
const MAX_TRAIL_POINTS = 60
// Anything faster than this between two points is a GPS glitch, not real travel.
const MAX_SPEED_MPS = 55 // ~200 km/h

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

// Drop "teleport" outliers: points that would need an impossible speed from the
// previous kept point (bad GPS fixes that draw wild straight lines on the trail).
function filterOutliers<T extends { latitude: number; longitude: number; createdAt: Date }>(points: T[]): T[] {
  const kept: T[] = []
  for (const p of points) {
    const prev = kept[kept.length - 1]
    if (!prev) {
      kept.push(p)
      continue
    }
    const dist = haversineMeters(prev.latitude, prev.longitude, p.latitude, p.longitude)
    const dt = Math.max(1, (p.createdAt.getTime() - prev.createdAt.getTime()) / 1000)
    if (dist / dt <= MAX_SPEED_MPS) kept.push(p)
  }
  return kept
}

// Admin/HR live map data: every currently-sharing employee with their latest
// position and a recent breadcrumb trail. Two indexed queries, grouped in JS.
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || (session.user.role !== "ADMIN" && session.user.role !== "HR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = Date.now()
    const trailSince = new Date(now - TRAIL_WINDOW_MS)
    const activeSince = now - ACTIVE_WINDOW_MS

    // Pull all pings in the trail window (indexed on createdAt), oldest first so
    // trails come out in draw order.
    const pings = await prisma.locationPing.findMany({
      where: { createdAt: { gte: trailSince } },
      orderBy: { createdAt: "asc" },
      select: {
        userId: true,
        latitude: true,
        longitude: true,
        accuracy: true,
        heading: true,
        speed: true,
        createdAt: true,
      },
    })

    // Group by user; keep the full trail and the latest point.
    const byUser = new Map<string, typeof pings>()
    for (const p of pings) {
      const arr = byUser.get(p.userId)
      if (arr) arr.push(p)
      else byUser.set(p.userId, [p])
    }

    // An employee is "live" only if their most recent ping is within the window.
    const activeUserIds: string[] = []
    for (const [userId, arr] of byUser) {
      const last = arr[arr.length - 1]
      if (last.createdAt.getTime() >= activeSince) activeUserIds.push(userId)
    }

    if (activeUserIds.length === 0) {
      return NextResponse.json({ employees: [], serverTime: new Date(now).toISOString() })
    }

    // Today's window for attendance + leave status.
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayEnd.getDate() + 1)

    const [users, todayAttendance, todayLeaves] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: activeUserIds } },
        select: { id: true, firstName: true, lastName: true, employeeId: true, department: true },
      }),
      prisma.attendanceRecord.findMany({
        where: { userId: { in: activeUserIds }, date: { gte: todayStart, lt: todayEnd } },
        select: { userId: true, checkInTime: true, checkOutTime: true },
      }),
      prisma.leaveRequest.findMany({
        where: {
          userId: { in: activeUserIds },
          status: "APPROVED",
          startDate: { lte: todayEnd },
          endDate: { gte: todayStart },
        },
        select: { userId: true },
      }),
    ])

    const userById = new Map(users.map((u) => [u.id, u]))
    const attendanceByUser = new Map(todayAttendance.map((a) => [a.userId, a]))
    const onLeaveUsers = new Set(todayLeaves.map((l) => l.userId))

    // Derive a single status per employee (leave takes priority, then attendance).
    function statusFor(userId: string): "ON_LEAVE" | "CHECKED_OUT" | "CHECKED_IN" | "NOT_CHECKED_IN" {
      if (onLeaveUsers.has(userId)) return "ON_LEAVE"
      const att = attendanceByUser.get(userId)
      if (att?.checkInTime && att?.checkOutTime) return "CHECKED_OUT"
      if (att?.checkInTime) return "CHECKED_IN"
      return "NOT_CHECKED_IN"
    }

    const employees = activeUserIds
      .map((userId) => {
        const arr = byUser.get(userId)!
        const last = arr[arr.length - 1]
        const user = userById.get(userId)
        if (!user) return null
        const att = attendanceByUser.get(userId)
        // Downsample to the most recent points, then drop GPS-glitch outliers so
        // the trail only shows plausible movement.
        const recent = arr.length > MAX_TRAIL_POINTS ? arr.slice(-MAX_TRAIL_POINTS) : arr
        const trailArr = filterOutliers(recent)

        // Current speed → travel mode. Use the GPS speed if present, else derive
        // it from the last two trail points. >20 km/h = riding (bike/vehicle).
        let speedKmh = 0
        if (typeof last.speed === "number" && last.speed >= 0) {
          speedKmh = last.speed * 3.6
        } else if (trailArr.length >= 2) {
          const a = trailArr[trailArr.length - 2]
          const b = trailArr[trailArr.length - 1]
          const dMeters = haversineMeters(a.latitude, a.longitude, b.latitude, b.longitude)
          const dtSec = Math.max(1, (b.createdAt.getTime() - a.createdAt.getTime()) / 1000)
          speedKmh = (dMeters / dtSec) * 3.6
        }
        const mode: "riding" | "walking" | "stationary" =
          speedKmh > 20 ? "riding" : speedKmh > 3 ? "walking" : "stationary"

        return {
          user,
          status: statusFor(userId),
          speedKmh: Math.round(speedKmh),
          mode,
          checkInTime: att?.checkInTime ? att.checkInTime.toISOString() : null,
          checkOutTime: att?.checkOutTime ? att.checkOutTime.toISOString() : null,
          current: {
            latitude: last.latitude,
            longitude: last.longitude,
            accuracy: last.accuracy,
            heading: last.heading,
            speed: last.speed,
            recordedAt: last.createdAt.toISOString(),
          },
          trail: trailArr.map((p) => ({
            latitude: p.latitude,
            longitude: p.longitude,
            recordedAt: p.createdAt.toISOString(),
          })),
        }
      })
      .filter(Boolean)

    return NextResponse.json({ employees, serverTime: new Date(now).toISOString() })
  } catch (error) {
    console.error("Error fetching live locations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
