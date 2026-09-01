// Shared, accurate distance computation from location pings.
// Filters GPS jitter (small drifts), unreliable fixes, and teleport glitches.

const MAX_SPEED_MPS = 55 // ~200 km/h — anything faster is a GPS glitch
const NOISE_FLOOR_M = 50 // movement below this is treated as jitter, not travel
const MAX_ACCURACY_M = 50 // ignore fixes worse than this accuracy

export interface PingPoint {
  latitude: number
  longitude: number
  accuracy: number | null
  createdAt: Date
}

export function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

// Metres travelled for one user's time-ordered pings.
export function distanceMeters(points: PingPoint[]): number {
  let meters = 0
  let ref: PingPoint | null = null // last point we actually moved from
  for (const p of points) {
    if (p.accuracy != null && p.accuracy > MAX_ACCURACY_M) continue
    if (!ref) {
      ref = p
      continue
    }
    const d = haversineMeters(ref.latitude, ref.longitude, p.latitude, p.longitude)
    if (d < NOISE_FLOOR_M) continue // jitter — keep the same reference
    const dt = Math.max(1, (p.createdAt.getTime() - ref.createdAt.getTime()) / 1000)
    if (d / dt <= MAX_SPEED_MPS) meters += d
    ref = p
  }
  return meters
}

// Group ordered pings by user and return metres per user.
export function distancesByUser(pings: (PingPoint & { userId: string })[]): Map<string, number> {
  const byUser = new Map<string, PingPoint[]>()
  for (const p of pings) {
    const arr = byUser.get(p.userId)
    if (arr) arr.push(p)
    else byUser.set(p.userId, [p])
  }
  const out = new Map<string, number>()
  for (const [userId, arr] of byUser) out.set(userId, distanceMeters(arr))
  return out
}

export const kmRound = (meters: number) => Math.round((meters / 1000) * 10) / 10
