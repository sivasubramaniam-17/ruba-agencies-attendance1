"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import useSWR from "swr"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Users, Radio, Maximize, Play, Pause, X, Clock } from "lucide-react"
import { type LiveEmployee, STATUS_META } from "@/components/admin/live-status"
import { reverseGeocode } from "@/lib/reverse-geocode"

// Leaflet touches window, so the map must be client-only (no SSR).
const LiveTrackingMap = dynamic(() => import("@/components/admin/live-tracking-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-violet-50/40">
      <div className="animate-pulse text-violet-600">Loading map…</div>
    </div>
  ),
})

export default function LiveTrackingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Poll the live feed every 5s so the marker moves near-live (Google-Maps feel).
  // SWR pauses this automatically when the tab is hidden, so the DB sleeps and we
  // only spend while someone is actually watching. refreshWhenHidden stays off.
  const isAdminOrHr = session && (session.user.role === "ADMIN" || session.user.role === "HR")
  const { data, isLoading } = useSWR<{ employees: LiveEmployee[]; serverTime: string }>(
    isAdminOrHr ? "/api/location/live" : null,
    { refreshInterval: 5000, revalidateOnFocus: true },
  )

  // Distance-travelled-today per employee. 20s beat so the live tail (recent
  // riding) shows up quickly; SWR pauses it when the tab is hidden.
  const { data: statsData } = useSWR<{ distanceByUser: Record<string, number>; teamKm: number }>(
    isAdminOrHr ? "/api/location/stats" : null,
    { refreshInterval: 20000 },
  )
  const distanceByUser = statsData?.distanceByUser ?? {}
  const teamKm = statsData?.teamKm ?? 0

  // Which employee the admin tapped in the list — the map flies to them.
  const [focusId, setFocusId] = useState<string | null>(null)
  // Bump to re-frame the map back to the overview ("Reset view").
  const [resetSignal, setResetSignal] = useState(0)
  const resetView = () => {
    setFocusId(null)
    setResetSignal((n) => n + 1)
  }

  const employees = data?.employees ?? []

  // ---- Day-route replay ("rewind and watch where they went") ----
  const REPLAY_COLOR = "#7c3aed"
  interface ReplayStop { lat: number; lng: number; arrive: number; leave: number; minutes: number }
  const [replayUser, setReplayUser] = useState<{ id: string; name: string; initials: string } | null>(null)
  const [replayPts, setReplayPts] = useState<[number, number][]>([])
  const [replayTimes, setReplayTimes] = useState<number[]>([])
  const [replayStops, setReplayStops] = useState<ReplayStop[]>([])
  const [replayIdx, setReplayIdx] = useState(0)
  const [replayPlaying, setReplayPlaying] = useState(false)
  const [replaySpeed, setReplaySpeed] = useState(4)
  const [replayLoading, setReplayLoading] = useState(false)
  const todayStr = new Date().toISOString().split("T")[0]
  const [replayDate, setReplayDate] = useState(todayStr)

  const startReplay = (e: LiveEmployee) => {
    setFocusId(null)
    setReplayDate(todayStr)
    setReplayUser({
      id: e.user.id,
      name: `${e.user.firstName} ${e.user.lastName}`,
      initials: `${e.user.firstName?.[0] ?? ""}${e.user.lastName?.[0] ?? ""}`.toUpperCase(),
    })
  }

  // Load the route whenever the replayed employee or the chosen date changes.
  useEffect(() => {
    if (!replayUser) return
    let cancelled = false
    setReplayLoading(true)
    setReplayPlaying(false)
    fetch(`/api/location/path?userId=${replayUser.id}&date=${replayDate}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        const pts = (d.points ?? []).map((p: { lat: number; lng: number }) => [p.lat, p.lng]) as [number, number][]
        setReplayPts(pts)
        setReplayTimes((d.points ?? []).map((p: { t: number }) => p.t))
        setReplayStops(d.stops ?? [])
        setReplayIdx(0)
        setReplayPlaying(pts.length > 1)
      })
      .catch(() => {
        if (!cancelled) setReplayPts([])
      })
      .finally(() => {
        if (!cancelled) setReplayLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayUser?.id, replayDate])

  const closeReplay = () => {
    setReplayUser(null)
    setReplayPts([])
    setReplayTimes([])
    setReplayStops([])
    setReplayPlaying(false)
    setReplayIdx(0)
  }

  // Advance the replay while playing — step `speed` points every 120ms.
  useEffect(() => {
    if (!replayPlaying || replayPts.length < 2) return
    const id = setInterval(() => {
      setReplayIdx((i) => {
        const next = i + replaySpeed
        if (next >= replayPts.length - 1) {
          setReplayPlaying(false)
          return replayPts.length - 1
        }
        return next
      })
    }, 120)
    return () => clearInterval(id)
  }, [replayPlaying, replaySpeed, replayPts.length])

  const replayClock = (t?: number) =>
    t ? new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"

  // Resolve a human-readable area name for each live employee (cached; barely
  // hits the network) so the admin can read exactly where they're standing.
  // NOTE: all hooks must run before any early return (Rules of Hooks).
  const [areas, setAreas] = useState<Record<string, string>>({})
  useEffect(() => {
    employees.forEach((e) => {
      reverseGeocode(e.current.latitude, e.current.longitude).then((area) => {
        if (area) {
          setAreas((prev) => (prev[e.user.id] === area ? prev : { ...prev, [e.user.id]: area }))
        }
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees])

  if (status === "loading") {
    return (
      <DashboardLayout>
        <div className="flex min-h-[400px] items-center justify-center p-4">
          <div className="animate-pulse text-lg text-violet-600">Loading…</div>
        </div>
      </DashboardLayout>
    )
  }

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "HR")) {
    router.push("/dashboard")
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-violet-900">
              <Radio className="h-6 w-6 text-violet-600" />
              Live Tracking
            </h1>
            <p className="text-sm text-gray-500">
              Employees currently sharing their location · updates live
            </p>
          </div>
          <div className="flex w-fit flex-wrap items-center gap-2">
            <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100">
              🚶 {teamKm} km today
            </Badge>
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
              <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-green-500" />
              {employees.length} live now
            </Badge>
          </div>
        </div>

        {/* Status legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
          {Object.values(STATUS_META).map((m) => (
            <span key={m.label} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.color }} />
              {m.label}
            </span>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-4 lg:items-start">
          {/* Map — sticks just below the header so it stays in view while the
              employee list scrolls beside it. */}
          <Card className="overflow-hidden border-violet-200 shadow-lg lg:col-span-3 lg:sticky lg:top-20 lg:self-start">
            <div className="relative h-[60vh] min-h-[420px] w-full lg:h-[calc(100vh-7rem)]">
              {employees.length === 0 && !isLoading && !replayUser ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 bg-violet-50/40 text-center">
                  <MapPin className="h-10 w-10 text-violet-300" />
                  <p className="font-medium text-violet-900">No one is sharing location right now</p>
                  <p className="max-w-sm text-sm text-gray-500">
                    Ask employees to turn on “Share my live location” from their dashboard. They’ll appear here within a
                    few seconds.
                  </p>
                </div>
              ) : (
                <>
                  <LiveTrackingMap
                    employees={employees}
                    areas={areas}
                    focusId={focusId}
                    resetSignal={resetSignal}
                    replay={
                      replayUser
                        ? { points: replayPts, index: replayIdx, label: replayUser.initials, color: REPLAY_COLOR, stops: replayStops }
                        : null
                    }
                  />
                  {/* Reset view — hidden while replaying (replay has its own bar). */}
                  {!replayUser && (
                    <button
                      type="button"
                      onClick={resetView}
                      className="absolute right-3 top-3 z-[1000] flex items-center gap-1.5 rounded-full border border-violet-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-md backdrop-blur transition-colors hover:bg-violet-50"
                    >
                      <Maximize className="h-3.5 w-3.5" />
                      Reset view
                    </button>
                  )}

                  {/* Replay control bar */}
                  {replayUser && (
                    <div className="absolute inset-x-3 bottom-3 z-[1000] rounded-xl border border-violet-200 bg-white/95 p-3 shadow-lg backdrop-blur">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: REPLAY_COLOR }}>
                          {replayUser.initials}
                        </span>
                        <span className="truncate text-sm font-semibold text-violet-900">{replayUser.name}</span>
                        <span className="ml-1 inline-flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {replayLoading ? "Loading…" : replayClock(replayTimes[replayIdx])}
                        </span>
                        <button
                          type="button"
                          onClick={closeReplay}
                          className="ml-auto rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          title="Exit replay"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      {replayPts.length > 1 ? (
                        <>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (replayIdx >= replayPts.length - 1) setReplayIdx(0)
                                setReplayPlaying((p) => !p)
                              }}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white hover:bg-violet-700"
                            >
                              {replayPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </button>
                            <input
                              type="range"
                              min={0}
                              max={replayPts.length - 1}
                              value={replayIdx}
                              onChange={(ev) => {
                                setReplayPlaying(false)
                                setReplayIdx(Number(ev.target.value))
                              }}
                              className="h-1.5 w-full cursor-pointer accent-violet-600"
                            />
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[11px] text-gray-500">
                              {replayClock(replayTimes[0])} → {replayClock(replayTimes[replayTimes.length - 1])}
                            </span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 4, 8].map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => setReplaySpeed(s)}
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                    replaySpeed === s ? "bg-violet-600 text-white" : "bg-violet-50 text-violet-700 hover:bg-violet-100"
                                  }`}
                                >
                                  {s}×
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-gray-500">
                          {replayLoading ? "Loading route…" : "No movement recorded today for this employee."}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>

          {/* Replay stops timeline — where they arrived and how long they stayed. */}
          {replayUser && (
            <Card className="border-violet-200 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-violet-900">
                  <Play className="h-4 w-4 text-violet-600" />
                  Replay · {replayUser.name}
                  <button
                    type="button"
                    onClick={closeReplay}
                    className="ml-auto rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    title="Exit replay"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </CardTitle>
                <div className="mt-1 flex items-center gap-2">
                  <label className="text-xs text-gray-500">Day</label>
                  <input
                    type="date"
                    value={replayDate}
                    max={todayStr}
                    onChange={(ev) => setReplayDate(ev.target.value)}
                    className="rounded-md border border-violet-200 px-2 py-1 text-xs"
                  />
                  {replayDate === todayStr && <span className="text-[10px] font-semibold text-green-600">Today</span>}
                </div>
                <p className="mt-1 text-xs text-gray-400">Tap a stop to jump there.</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {replayStops.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    {replayLoading ? "Loading…" : "No stops of 5+ minutes recorded today."}
                  </p>
                ) : (
                  replayStops.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        // Jump the scrubber to the point nearest this stop's arrival.
                        let best = 0
                        let bestDiff = Infinity
                        replayTimes.forEach((t, idx) => {
                          const diff = Math.abs(t - s.arrive)
                          if (diff < bestDiff) {
                            bestDiff = diff
                            best = idx
                          }
                        })
                        setReplayPlaying(false)
                        setReplayIdx(best)
                      }}
                      className="flex w-full items-center gap-3 rounded-lg border border-violet-100 p-2 text-left hover:bg-violet-50"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-gray-900">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-violet-900">Stayed {s.minutes} min</p>
                        <p className="text-xs text-gray-500">
                          {replayClock(s.arrive)} → {replayClock(s.leave)}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* Live employee list — grows with the page; the sticky map stays put. */}
          <Card className="border-violet-200 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-violet-900">
                <Users className="h-4 w-4 text-violet-600" />
                Active Employees
                <span className="ml-auto rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                  {employees.length}
                </span>
              </CardTitle>
              <p className="text-xs text-gray-400">Tap an employee to see their route on the map.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {employees.length === 0 ? (
                <p className="text-sm text-gray-500">No active employees.</p>
              ) : (
                employees.map((e) => {
                  const meta = STATUS_META[e.status]
                  return (
                    <div
                      key={e.user.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setFocusId((cur) => (cur === e.user.id ? null : e.user.id))}
                      title={focusId === e.user.id ? "Hide route" : "Show route on map"}
                      className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border p-2 text-left transition-colors hover:bg-violet-50 ${
                        focusId === e.user.id ? "border-violet-400 bg-violet-50 ring-1 ring-violet-300" : "border-violet-100"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-violet-900">
                          {e.user.firstName} {e.user.lastName}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {e.user.employeeId} · {e.user.department}
                        </p>
                        <span
                          className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{ backgroundColor: meta.color + "22", color: meta.color }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                          {meta.label}
                        </span>
                        {e.mode === "riding" && (
                          <span className="mt-1 ml-1 inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                            🏍️ Riding · {e.speedKmh} km/h
                          </span>
                        )}
                        <p className="mt-1 flex items-start gap-1 text-[11px] text-gray-600">
                          <MapPin className="mt-[1px] h-3 w-3 shrink-0 text-violet-500" />
                          <span className="truncate" title={areas[e.user.id] || undefined}>
                            {areas[e.user.id] || "Locating area…"}
                          </span>
                        </p>
                        {distanceByUser[e.user.id] != null && (
                          <p className="mt-1 text-[11px] font-medium text-violet-700">
                            🚶 {distanceByUser[e.user.id]} km travelled today
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation()
                            startReplay(e)
                          }}
                          className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-violet-600 px-2.5 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-violet-700"
                        >
                          <Play className="h-3 w-3" />
                          Replay today
                        </button>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-500" />
                        <p className="text-[10px] text-gray-400">
                          {new Date(e.current.recordedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
