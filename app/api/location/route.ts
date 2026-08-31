import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

// Employee device posts its current GPS position here while "Share live
// location" is on. One lightweight row per ping; old rows are pruned so the
// table stays small.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { latitude, longitude, accuracy, heading, speed } = await request.json()

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json({ error: "latitude and longitude must be numbers" }, { status: 400 })
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: "Coordinates out of range" }, { status: 400 })
    }

    await prisma.locationPing.create({
      data: {
        userId: user.id,
        latitude,
        longitude,
        accuracy: typeof accuracy === "number" ? accuracy : null,
        heading: typeof heading === "number" ? heading : null,
        speed: typeof speed === "number" ? speed : null,
      },
    })

    // Opportunistic cleanup (~5% of requests): drop pings older than 24h so the
    // history table never grows unbounded, without paying the cost every ping.
    if (Math.random() < 0.05) {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
      await prisma.locationPing.deleteMany({ where: { createdAt: { lt: cutoff } } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error recording location ping:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
