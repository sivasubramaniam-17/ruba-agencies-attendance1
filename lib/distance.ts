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
// The most recent slice of pings is counted "live" (point-to-point) instead of
// waiting for its 5-min window to close, so a rider's distance climbs right away.
// A stricter speed gate keeps this responsive part jitter-free for a stopped user.
const TAIL_MS = 3 * 60 * 1000 // 3 minutes
const TAIL_MIN_MPS = 15 / 3.6 // ~15 km/h — clear riding only, in the live tail

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

interface Centroid {
  lat: number
  lng: number
  tStart: number // window start — used for centroid-to-centroid timing
  tEnd: number // latest fix in the window — used to connect to the live tail
}

// Average each 5-min window of fixes into one centroid point (noise cancels out).
function buildCentroids(points: PingPoint[]): Centroid[] {
  const buckets = new Map<number, { sumLat: number; sumLng: number; n: number; tStart: number; tEnd: number }>()
  for (const p of points) {
    const t = p.createdAt.getTime()
    const key = Math.floor(t / WINDOW_MS)
    const b = buckets.get(key)
    if (b) {
      b.sumLat += p.latitude
      b.sumLng += p.longitude
      b.n++
      if (t > b.tEnd) b.tEnd = t
    } else {
      buckets.set(key, { sumLat: p.latitude, sumLng: p.longitude, n: 1, tStart: key * WINDOW_MS, tEnd: t })
    }
  }
  return Array.from(buckets.values())
    .sort((a, b) => a.tStart - b.tStart)
    .map((b) => ({ lat: b.sumLat / b.n, lng: b.sumLng / b.n, tStart: b.tStart, tEnd: b.tEnd }))
}

// Metres travelled for one user's time-ordered pings. Older fixes are averaged
// into 5-min centroids (so a person sitting still, whose readings scatter around
// one spot, ends up with ~0 km), while the most recent few minutes are counted
// point-to-point so a moving rider's distance climbs live instead of waiting for
// the window to close. Only genuine travel speed is counted in either part.
export function distanceMeters(points: PingPoint[]): number {
  // Drop unreliable fixes (poor accuracy = very noisy cell/wifi location).
  const good = points
    .filter((p) => p.accuracy == null || p.accuracy <= MAX_ACCURACY_M)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  if (good.length < 2) return 0

  const tailCut = good[good.length - 1].createdAt.getTime() - TAIL_MS
  const settled = good.filter((p) => p.createdAt.getTime() < tailCut)
  const tail = good.filter((p) => p.createdAt.getTime() >= tailCut)

  let meters = 0

  // --- Settled part: jitter-cancelling 5-min centroids ---
  const centroids = buildCentroids(settled)
  for (let i = 1; i < centroids.length; i++) {
    const a = centroids[i - 1]
    const c = centroids[i]
    const d = haversineMeters(a.lat, a.lng, c.lat, c.lng)
    if (d < NOISE_FLOOR_M) continue // residual jitter between windows — ignore
    const dt = Math.max(1, (c.tStart - a.tStart) / 1000)
    const speed = d / dt
    if (speed >= MIN_TRAVEL_MPS && speed <= MAX_SPEED_MPS) meters += d
  }

  // --- Live tail: recent fixes, point-to-point, anchored to the last centroid ---
  const lastCentroid = centroids[centroids.length - 1]
  let anchor = lastCentroid
    ? { lat: lastCentroid.lat, lng: lastCentroid.lng, t: lastCentroid.tEnd }
    : tail.length
      ? { lat: tail[0].latitude, lng: tail[0].longitude, t: tail[0].createdAt.getTime() }
      : null
  const startIdx = lastCentroid ? 0 : 1
  for (let i = startIdx; i < tail.length; i++) {
    const p = tail[i]
    if (!anchor) break
    const d = haversineMeters(anchor.lat, anchor.lng, p.latitude, p.longitude)
    if (d < NOISE_FLOOR_M) continue // jitter around a standing spot — ignore
    const dt = Math.max(1, (p.createdAt.getTime() - anchor.t) / 1000)
    const speed = d / dt
    // Stricter speed gate here: point-to-point is noisier than centroids, so only
    // clear riding counts — a stopped person's recent jitter stays at 0.
    if (speed >= TAIL_MIN_MPS && speed <= MAX_SPEED_MPS) meters += d
    anchor = { lat: p.latitude, lng: p.longitude, t: p.createdAt.getTime() }
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
