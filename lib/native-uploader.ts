// JS bridge to the custom native LocationUploader plugin. On a real device this
// starts a native foreground service that reads GPS and POSTs to /api/location
// with a Bearer token — so it keeps tracking even after the app is cleared.
// On the web it's a no-op (the toggle falls back to browser geolocation).

import { Capacitor, registerPlugin } from "@capacitor/core"

const LocationUploader: any = registerPlugin("LocationUploader")

export const isNativeApp = () => Capacitor.isNativePlatform()

export async function startNativeUploader(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  try {
    // Get a signed token so the native service can authenticate without cookies.
    const res = await fetch("/api/location/token", { credentials: "include" })
    if (!res.ok) return false
    const { token } = await res.json()
    if (!token) return false
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    await LocationUploader.start({ url: `${origin}/api/location`, token })
    return true
  } catch {
    return false
  }
}

export async function stopNativeUploader(): Promise<void> {
  try {
    await LocationUploader.stop()
  } catch {
    // ignore
  }
}
