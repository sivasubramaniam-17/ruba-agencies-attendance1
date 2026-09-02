"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import useSWR from "swr"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlayCircle, Play, Pause, Clock, CalendarDays } from "lucide-react"
import { reverseGeocode } from "@/lib/reverse-geocode"

const LiveTrackingMap = dynamic(() => import("@/components/admin/live-tracking-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-violet-50/40">
      <div className="animate-pulse text-violet-600">Loading map…</div>
    </div>
  ),
})

const REPLAY_COLOR = "#7c3aed"

interface ReplayEmployee {
  user: { id: string; firstName: string; lastName: string; employeeId: string; department: string }
  dates: string[]
}
interface Stop {
  lat: number
  lng: number
  arrive: number
  leave: number
  minutes: number
}

const clock = (t?: number) => (t ? new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—")

export default function RouteReplayPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isAdminOrHr = session && (session.user.role === "ADMIN" || session.user.role === "HR")

  const { data } = useSWR<{ employees: ReplayEmployee[]; today: string }>(
    isAdminOrHr ? "/api/location/replay-days" : null,
  )
  const employees = useMemo(() => data?.employees ?? [], [data])
  const today = data?.today ?? new Date().toISOString().split("T")[0]

  const [userId, setUserId] = useState<string | null>(null)
  const [date, setDate] = useState<string>("")

  // Default to the first employee + today once the list loads.
  useEffect(() => {
    if (!userId && employees.length) {
      setUserId(employees[0].user.id)
      setDate(employees[0].dates[0] ?? today)
    }
  }, [employees, userId, today])

  const selected = employees.find((e) => e.user.id === userId) ?? null

  const [pts, setPts] = useState<[number, number][]>([])
  const [times, setTimes] = useState<number[]>([])
  const [stops, setStops] = useState<Stop[]>([])
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(4)
  const [loading, setLoading] = useState(false)
  const [stopAreas, setStopAreas] = useState<Record<number, string>>({})

  // Look up a place name for each stop (cached; barely hits the network).
  useEffect(() => {
    let cancelled = false
    setStopAreas({})
    ;(async () => {
      for (let i = 0; i < stops.length; i++) {
        const name = await reverseGeocode(stops[i].lat, stops[i].lng)
        if (cancelled) return
        if (name) setStopAreas((prev) => ({ ...prev, [i]: name }))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [stops])

  const stopsWithArea = useMemo(() => stops.map((s, i) => ({ ...s, area: stopAreas[i] })), [stops, stopAreas])
  const clockExact = (t?: number) =>
    t ? new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"

  // Load the route whenever the employee or date changes.
  useEffect(() => {
    if (!userId || !date) return
    let cancelled = false
    setLoading(true)
    setPlaying(false)
    fetch(`/api/location/path?userId=${userId}&date=${date}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        const p = (d.points ?? []).map((x: { lat: number; lng: number }) => [x.lat, x.lng]) as [number, number][]
        setPts(p)
        setTimes((d.points ?? []).map((x: { t: number }) => x.t))
        setStops(d.stops ?? [])
        setIdx(0)
        setPlaying(p.length > 1)
      })
      .catch(() => {
        if (!cancelled) setPts([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId, date])

  // Advance the scrubber while playing.
  useEffect(() => {
    if (!playing || pts.length < 2) return
    const id = setInterval(() => {
      setIdx((i) => {
        const next = i + speed
        if (next >= pts.length - 1) {
          setPlaying(false)
          return pts.length - 1
        }
        return next
      })
    }, 120)
    return () => clearInterval(id)
  }, [playing, speed, pts.length])

  const initials = selected
    ? `${selected.user.firstName?.[0] ?? ""}${selected.user.lastName?.[0] ?? ""}`.toUpperCase()
    : ""

  const dateLabel = (d: string) =>
    d === today ? "Today" : new Date(d).toLocaleDateString([], { day: "2-digit", month: "short" })

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
        <PageHeader
          title="Route Replay"
          subtitle="Rewind and watch where an employee travelled on any day"
          icon={PlayCircle}
        />

        <div className="grid gap-4 lg:grid-cols-4 lg:items-start">
          {/* Map with replay controls */}
          <Card className="overflow-hidden border-violet-200 shadow-lg lg:col-span-3 lg:sticky lg:top-20 lg:self-start">
            <div className="relative h-[60vh] min-h-[420px] w-full lg:h-[calc(100vh-7rem)]">
              <LiveTrackingMap
                employees={[]}
                replay={
                  selected ? { points: pts, index: idx, label: initials, color: REPLAY_COLOR, stops: stopsWithArea } : null
                }
              />
              {selected && (
                <div className="absolute inset-x-3 bottom-3 z-[1000] rounded-xl border border-violet-200 bg-white/95 p-3 shadow-lg backdrop-blur">
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ background: REPLAY_COLOR }}
                    >
                      {initials}
                    </span>
                    <span className="truncate text-sm font-semibold text-violet-900">
                      {selected.user.firstName} {selected.user.lastName}
                    </span>
                    <span className="ml-1 inline-flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {loading ? "Loading…" : clock(times[idx])}
                    </span>
                  </div>
                  {pts.length > 1 ? (
                    <>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (idx >= pts.length - 1) setIdx(0)
                            setPlaying((p) => !p)
                          }}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white hover:bg-violet-700"
                        >
                          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={pts.length - 1}
                          value={idx}
                          onChange={(ev) => {
                            setPlaying(false)
                            setIdx(Number(ev.target.value))
                          }}
                          className="h-1.5 w-full cursor-pointer accent-violet-600"
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[11px] text-gray-500">
                          {clock(times[0])} → {clock(times[times.length - 1])}
                        </span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 4, 8].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setSpeed(s)}
                              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                speed === s ? "bg-violet-600 text-white" : "bg-violet-50 text-violet-700 hover:bg-violet-100"
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
                      {loading ? "Loading route…" : "No movement recorded on this day."}
                    </p>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Employee + date picker and stops */}
          <div className="space-y-4">
            <Card className="border-violet-200 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-violet-900">
                  <CalendarDays className="h-4 w-4 text-violet-600" />
                  Pick employee & day
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <select
                  value={userId ?? ""}
                  onChange={(e) => {
                    const emp = employees.find((x) => x.user.id === e.target.value)
                    setUserId(e.target.value)
                    setDate(emp?.dates[0] ?? today)
                  }}
                  className="w-full rounded-md border border-violet-200 px-2 py-2 text-sm"
                >
                  {employees.map((e) => (
                    <option key={e.user.id} value={e.user.id}>
                      {e.user.firstName} {e.user.lastName} · {e.user.employeeId}
                    </option>
                  ))}
                </select>

                <div>
                  <p className="mb-1 text-xs text-gray-500">Available days</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(selected?.dates ?? []).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDate(d)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          date === d ? "bg-violet-600 text-white" : "bg-violet-50 text-violet-700 hover:bg-violet-100"
                        }`}
                      >
                        {dateLabel(d)}
                      </button>
                    ))}
                  </div>
                  {(selected?.dates.length ?? 0) <= 1 && (
                    <p className="mt-2 text-[11px] text-gray-400">
                      Past days appear here as they’re recorded each night.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-violet-200 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-violet-900">
                  <PlayCircle className="h-4 w-4 text-violet-600" />
                  Stops
                  <span className="ml-auto rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                    {stops.length}
                  </span>
                </CardTitle>
                <p className="text-xs text-gray-400">Tap a stop to jump there.</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {stops.length === 0 ? (
                  <p className="text-sm text-gray-500">{loading ? "Loading…" : "No stops of 5+ minutes."}</p>
                ) : (
                  stopsWithArea.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        let best = 0
                        let bestDiff = Infinity
                        times.forEach((t, j) => {
                          const diff = Math.abs(t - s.arrive)
                          if (diff < bestDiff) {
                            bestDiff = diff
                            best = j
                          }
                        })
                        setPlaying(false)
                        setIdx(best)
                      }}
                      className="flex w-full items-start gap-3 rounded-lg border border-violet-100 p-2 text-left hover:bg-violet-50"
                    >
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-gray-900">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-violet-900">
                          {s.area || "Locating place…"}
                        </p>
                        <p className="text-xs text-gray-600">Stayed {s.minutes} min</p>
                        <p className="text-[11px] text-gray-500">🟢 Arrived {clockExact(s.arrive)}</p>
                        <p className="text-[11px] text-gray-500">🔴 Left {clockExact(s.leave)}</p>
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
