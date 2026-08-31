// Lightweight reverse geocoding via OpenStreetMap Nominatim (free, no key).
// Results are cached by ~110 m grid cell so we barely hit the network and stay
// well within Nominatim's usage policy even while polling.

const cache = new Map<string, string>()
const inflight = new Set<string>()

function shortArea(address: any, displayName?: string): string {
  if (address) {
    const local =
      address.suburb ||
      address.neighbourhood ||
      address.village ||
      address.hamlet ||
      address.town ||
      address.city_district ||
      address.city ||
      address.municipality ||
      address.county
    const region = address.state_district || address.state
    if (local && region) return `${local}, ${region}`
    if (local) return local
    if (region) return region
  }
  if (displayName) return displayName.split(",").slice(0, 2).join(",").trim()
  return ""
}

const keyFor = (lat: number, lng: number) => `${lat.toFixed(4)},${lng.toFixed(4)}`

export function cachedArea(lat: number, lng: number): string | undefined {
  return cache.get(keyFor(lat, lng))
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = keyFor(lat, lng)
  const hit = cache.get(key)
  if (hit !== undefined) return hit
  if (inflight.has(key)) return ""
  inflight.add(key)
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
    )
    if (!res.ok) return ""
    const data = await res.json()
    const area = shortArea(data.address, data.display_name)
    if (area) cache.set(key, area)
    return area
  } catch {
    return ""
  } finally {
    inflight.delete(key)
  }
}
