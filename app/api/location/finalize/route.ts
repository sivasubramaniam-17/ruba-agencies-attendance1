import { type NextRequest, NextResponse } from "next/server"
import { computeAndStoreToday } from "@/lib/daily-distance"
import { computeAndStoreRouteToday } from "@/lib/daily-route"

// Called by the Vercel cron at ~10 PM IST to lock in each employee's distance
// for the day (so it's kept even after location pings are pruned).
export async function GET(request: NextRequest) {
  // If CRON_SECRET is set in Vercel, require it (Vercel sends it automatically).
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get("authorization")
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }
  try {
    // Lock in both the day's distance and a compact replay route before the raw
    // pings get pruned, so any past day stays cheap to store and replay.
    const [result, route] = await Promise.all([computeAndStoreToday(), computeAndStoreRouteToday()])
    return NextResponse.json({ ok: true, ...result, routesStored: route.stored })
  } catch (error) {
    console.error("Error finalizing daily distance/route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
