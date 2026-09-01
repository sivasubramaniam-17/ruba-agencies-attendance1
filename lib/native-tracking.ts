// Native background-location bridge (Capacitor + @capacitor-community/background-geolocation).
// On a real device this runs a foreground service so location keeps posting to
// /api/location while the app is minimized / screen off. (Force-clearing the app
// from recents can still stop it — that needs the paid native-HTTP plugin.)
// On the web it is a no-op; the web toggle keeps using the browser geolocation.

import { Capacitor, registerPlugin } from "@capacitor/core"

const BackgroundGeolocation: any = registerPlugin("BackgroundGeolocation")

export const isNativeApp = () => Capacitor.isNativePlatform()

let watcherId: string | null = null

async function postLocation(loc: any) {
  if (loc == null || typeof loc.latitude !== "number") return
  try {
    await fetch("/api/location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: typeof loc.accuracy === "number" ? loc.accuracy : null,
        heading: typeof loc.bearing === "number" ? loc.bearing : null,
        speed: typeof loc.speed === "number" ? loc.speed : null,
      }),
    })
  } catch {
    // Offline / transient — the plugin will deliver the next fix.
  }
}

// Returns true if native tracking started (or was already running).
export async function startNativeTracking(): Promise<boolean> {
  if (!isNativeApp()) return false
  if (watcherId) return true
  try {
    watcherId = await BackgroundGeolocation.addWatcher(
      {
        // Text of the persistent notification shown while tracking.
        backgroundTitle: "Ruba Attendance",
        backgroundMessage: "Sharing your live location.",
        requestPermissions: true,
        stale: false,
        distanceFilter: 25, // metres of movement before a new update (cost-tuned)
      },
      (location: any, error: any) => {
        if (error) return
        if (location) postLocation(location)
      },
    )
    return true
  } catch {
    watcherId = null
    return false
  }
}

export async function stopNativeTracking(): Promise<void> {
  if (!watcherId) return
  try {
    await BackgroundGeolocation.removeWatcher({ id: watcherId })
  } catch {
    // ignore
  }
  watcherId = null
}
