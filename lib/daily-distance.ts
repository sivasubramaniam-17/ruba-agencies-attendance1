import { prisma } from "@/lib/prisma"
import { distancesByUser, kmRound } from "@/lib/distance"
import { istMidnightUtc, istDayKey } from "@/lib/tracking-hours"

// Computes today's distance per employee from their pings and stores it in the
// daily_distances table (upsert). Used by the live stats, the history page, and
// the nightly cron so a day's total is preserved even after pings are pruned.
export async function computeAndStoreToday(): Promise<{
  distanceByUser: Record<string, number>
  teamKm: number
}> {
  const pings = await prisma.locationPing.findMany({
    where: { createdAt: { gte: istMidnightUtc() } },
    orderBy: { createdAt: "asc" },
    select: { userId: true, latitude: true, longitude: true, accuracy: true, createdAt: true },
  })

  const meterMap = distancesByUser(pings)
  const dayKey = istDayKey()
  const distanceByUser: Record<string, number> = {}
  let teamMeters = 0
  const ops: Promise<unknown>[] = []

  for (const [userId, meters] of meterMap) {
    const km = kmRound(meters)
    distanceByUser[userId] = km
    teamMeters += meters
    ops.push(
      prisma.dailyDistance.upsert({
        where: { userId_date: { userId, date: dayKey } },
        update: { distanceKm: km },
        create: { userId, date: dayKey, distanceKm: km },
      }),
    )
  }
  await Promise.all(ops)

  return { distanceByUser, teamKm: kmRound(teamMeters) }
}
