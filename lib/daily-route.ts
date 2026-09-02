import { prisma } from "@/lib/prisma"
import { buildRoutePath } from "@/lib/route-path"
import { istMidnightUtc, istDayKey } from "@/lib/tracking-hours"

// Computes today's compact route (path + stops) per employee from their pings and
// stores it in daily_routes, so the day can be replayed later even after the raw
// pings are pruned (24h). Called by the nightly finalize cron.
export async function computeAndStoreRouteToday(): Promise<{ stored: number }> {
  const pings = await prisma.locationPing.findMany({
    where: { createdAt: { gte: istMidnightUtc() } },
    orderBy: { createdAt: "asc" },
    select: { userId: true, latitude: true, longitude: true, accuracy: true, createdAt: true },
  })

  const byUser = new Map<string, typeof pings>()
  for (const p of pings) {
    const arr = byUser.get(p.userId)
    if (arr) arr.push(p)
    else byUser.set(p.userId, [p])
  }

  const dayKey = istDayKey()
  const ops: Promise<unknown>[] = []
  let stored = 0
  for (const [userId, arr] of byUser) {
    const route = buildRoutePath(arr)
    if (route.points.length === 0) continue
    stored++
    const data = {
      points: route.points as unknown as object,
      stops: route.stops as unknown as object,
      startT: route.startT,
      endT: route.endT,
    }
    ops.push(
      prisma.dailyRoute.upsert({
        where: { userId_date: { userId, date: dayKey } },
        update: data,
        create: { userId, date: dayKey, ...data },
      }),
    )
  }
  await Promise.all(ops)
  return { stored }
}
