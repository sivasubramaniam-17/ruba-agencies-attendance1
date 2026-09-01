"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MapPin, Navigation, ShieldCheck } from "lucide-react"
import { isNativeApp, startNativeTracking, stopNativeTracking } from "@/lib/native-tracking"

// Post the device position at most this often while sharing.
const POST_INTERVAL_MS = 10000
const STORAGE_KEY = "shareLiveLocation"

export function LiveLocationToggle() {
  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null)
  const [hasFix, setHasFix] = useState(false)

  const watchIdRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const latestRef = useRef<GeolocationCoordinates | null>(null)
  const firstSentRef = useRef(false)
  const sharingRef = useRef(false)
  const wakeLockRef = useRef<any>(null)

  // Keep the screen awake while sharing so the browser doesn't suspend the tab
  // when the phone is pocketed. This is the best a web app can do — it still
  // stops if the app is closed/cleared (only a native app can track then).
  const requestWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator && !wakeLockRef.current) {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen")
        wakeLockRef.current.addEventListener?.("release", () => {
          wakeLockRef.current = null
        })
      }
    } catch {
      // Wake Lock unsupported/denied — tracking still works while app is open.
    }
  }, [])

  const releaseWakeLock = useCallback(() => {
    try {
      wakeLockRef.current?.release?.()
    } catch {
      /* ignore */
    }
    wakeLockRef.current = null
  }, [])

  const sendPing = useCallback(async () => {
    const c = latestRef.current
    if (!c) return
    try {
      const res = await fetch("/api/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: c.latitude,
          longitude: c.longitude,
          accuracy: typeof c.accuracy === "number" ? c.accuracy : null,
          heading: typeof c.heading === "number" && Number.isFinite(c.heading) ? c.heading : null,
          speed: typeof c.speed === "number" && Number.isFinite(c.speed) ? c.speed : null,
        }),
      })
      if (res.ok) setLastSentAt(new Date())
    } catch {
      // Network hiccup — the next interval tick will retry.
    }
  }, [])

  const stop = useCallback(() => {
    if (isNativeApp()) stopNativeTracking()
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    latestRef.current = null
    firstSentRef.current = false
    releaseWakeLock()
    setHasFix(false)
    setAccuracy(null)
  }, [releaseWakeLock])

  const start = useCallback(() => {
    // In the native Android app, use the background foreground-service tracker so
    // location keeps posting while the app is minimized / screen off.
    if (isNativeApp()) {
      setError(null)
      sharingRef.current = true
      startNativeTracking().then((ok) => {
        if (ok) {
          setHasFix(true)
          setLastSentAt(new Date())
        } else {
          setError("Couldn't start background tracking. Please allow Location \"All the time\".")
        }
      })
      return
    }

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setError("Geolocation is not supported on this device.")
      setSharing(false)
      return
    }
    setError(null)
    firstSentRef.current = false
    sharingRef.current = true
    requestWakeLock()

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        latestRef.current = pos.coords
        setAccuracy(pos.coords.accuracy)
        setHasFix(true)
        setError(null)
        // Send the very first fix immediately; the interval handles the rest
        // (including when the employee is standing still).
        if (!firstSentRef.current) {
          firstSentRef.current = true
          sendPing()
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          // Denied permission is the only case we stop for — it won't self-recover.
          setError(
            "Location permission is off. Tap the padlock (or ⋮ menu) in your browser → Permissions → Location → Allow, then switch this back on.",
          )
          setSharing(false)
          sharingRef.current = false
          localStorage.setItem(STORAGE_KEY, "0")
          stop()
          return
        }
        // Cloned-app / Second Space / Private Space: the browser can't reach GPS.
        const raw = `${err.message || ""}`.toLowerCase()
        if (raw.includes("userhandle") || raw.includes("not allowed") || raw.includes("apiexception")) {
          setError(
            "This browser can't access GPS (it's running in a cloned app or Second Space). Open this page in your normal Chrome — not a cloned/dual browser — with Location turned on.",
          )
          return
        }
        if (err.code === err.TIMEOUT) {
          setError("Getting your GPS signal is slow. Keep this page open; it will keep trying.")
          return
        }
        // POSITION_UNAVAILABLE / anything else — usually transient.
        setError("Can't get a GPS fix right now. Make sure Location is turned on. Retrying…")
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    )

    intervalRef.current = setInterval(sendPing, POST_INTERVAL_MS)
  }, [sendPing, stop, requestWakeLock])

  const handleToggle = useCallback(
    (next: boolean) => {
      setSharing(next)
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
      if (next) {
        start()
      } else {
        sharingRef.current = false
        stop()
        setLastSentAt(null)
      }
    },
    [start, stop],
  )

  // Resume sharing on reload if the employee left it on. Always clean up on unmount.
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1") {
      setSharing(true)
      start()
    }
    return () => stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Self-healing: background tabs get their timers throttled/suspended, so when
  // the page becomes visible again (or the network reconnects) push a fresh ping
  // immediately and make sure the interval is still running.
  useEffect(() => {
    const recover = () => {
      if (!sharingRef.current || document.visibilityState !== "visible") return
      requestWakeLock() // wake locks are dropped when hidden — re-acquire
      sendPing()
      if (!intervalRef.current) {
        intervalRef.current = setInterval(sendPing, POST_INTERVAL_MS)
      }
    }
    document.addEventListener("visibilitychange", recover)
    window.addEventListener("online", recover)
    return () => {
      document.removeEventListener("visibilitychange", recover)
      window.removeEventListener("online", recover)
    }
  }, [sendPing, requestWakeLock])

  return (
    <Card className="border-violet-200 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-violet-900 flex items-center gap-2 text-base">
          <Navigation className="h-5 w-5 text-violet-600" />
          Live Location Sharing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-violet-100 bg-violet-50/40 p-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-violet-900">Share my live location</p>
            <p className="text-xs text-gray-500">
              {sharing
                ? "Your position is visible to the admin while this is on."
                : "Turn on so the admin can see your location in real time."}
            </p>
          </div>
          <Switch checked={sharing} onCheckedChange={handleToggle} aria-label="Share live location" />
        </div>

        {sharing && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
              <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-green-500" />
              {hasFix ? "Live" : "Getting GPS fix…"}
            </Badge>
            {accuracy != null && (
              <span className="flex items-center gap-1 text-gray-600">
                <MapPin className="h-3 w-3" /> ±{Math.round(accuracy)} m
              </span>
            )}
            {lastSentAt && (
              <span className="text-gray-500">
                Updated {lastSentAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <p className="flex items-start gap-1.5 text-[11px] leading-snug text-gray-400">
          <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
          Location is only shared while this switch is on and stops the moment you turn it off.
        </p>
      </CardContent>
    </Card>
  )
}
