// Shared, accurate distance computation from location pings.
// Filters GPS jitter (small drifts), unreliable fixes, and teleport glitches.

const MAX_SPEED_MPS = 55 // ~200 km/h — anything faster is a GPS glitch
const NOISE_FLOOR_M = 50 // movement below this is treated as jitter, not travel
const MAX_ACCURACY_M = 50 // ignore fixes worse than this accuracy
// Only count distance while actually travelling (bike/vehicle). Slower than this
// is walking or GPS jitter and is ignored — so standing still adds 0 km.
const MIN_TRAVEL_MPS = 10 / 3.6 // 10 km/h
// Average each fixed time-window into a single centroid point. 5 minutes cancels
// GPS jitter well enough that a stationary employee stays at 0 km (a shorter
// window lets noise leak back in and inflate a standing person's distance).
const WINDOW_MS = 5 * 60 * 1000 // 5 minutes

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

// Metres travelled for one user's time-ordered pings. To beat GPS jitter we
// average every window into one centroid (noise cancels out), then sum the
// distance between consecutive centroids — so a person sitting still, whose
// readings scatter around one spot, ends up with ~0 km. Only segments at genuine
// travel speed are counted, so walking and jitter don't inflate the total.
export function distanceMeters(points: PingPoint[]): number {
  // Drop unreliable fixes (poor accuracy = very noisy cell/wifi location).
  const good = points.filter((p) => p.accuracy == null || p.accuracy <= MAX_ACCURACY_M)
  if (good.length < 2) return 0

  // Bucket into windows and take each window's centroid (mean position).
  const buckets = new Map<number, { sumLat: number; sumLng: number; n: number; t: number }>()
  for (const p of good) {
    const key = Math.floor(p.createdAt.getTime() / WINDOW_MS)
    const b = buckets.get(key)
    if (b) {
      b.sumLat += p.latitude
      b.sumLng += p.longitude
      b.n++
    } else {
      buckets.set(key, { sumLat: p.latitude, sumLng: p.longitude, n: 1, t: key * WINDOW_MS })
    }
  }
  const centroids = Array.from(buckets.values())
    .sort((a, b) => a.t - b.t)
    .map((b) => ({ lat: b.sumLat / b.n, lng: b.sumLng / b.n, t: b.t }))

  let meters = 0
  for (let i = 1; i < centroids.length; i++) {
    const a = centroids[i - 1]
    const c = centroids[i]
    const d = haversineMeters(a.lat, a.lng, c.lat, c.lng)
    if (d < NOISE_FLOOR_M) continue // residual jitter between windows — ignore
    const dt = Math.max(1, (c.t - a.t) / 1000)
    const speed = d / dt
    // Count only genuine travel (bike/vehicle), not walking or jitter.
    if (speed >= MIN_TRAVEL_MPS && speed <= MAX_SPEED_MPS) meters += d
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
