"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import useSWR from "swr"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Users, Radio } from "lucide-react"
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

  // Poll the live feed every 8s; dedupe/caching handled by SWR.
  const { data, isLoading } = useSWR<{ employees: LiveEmployee[]; serverTime: string }>(
    session && (session.user.role === "ADMIN" || session.user.role === "HR") ? "/api/location/live" : null,
    { refreshInterval: 25000, revalidateOnFocus: true },
  )

  const employees = data?.employees ?? []

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
              Employees currently sharing their location (updates every ~25s).
            </p>
          </div>
          <Badge className="w-fit bg-green-100 text-green-700 hover:bg-green-100">
            <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-green-500" />
            {employees.length} live now
          </Badge>
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

        <div className="grid gap-4 lg:grid-cols-4">
          {/* Map */}
          <Card className="overflow-hidden border-violet-200 shadow-lg lg:col-span-3">
            <div className="h-[60vh] min-h-[420px] w-full">
              {employees.length === 0 && !isLoading ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 bg-violet-50/40 text-center">
                  <MapPin className="h-10 w-10 text-violet-300" />
                  <p className="font-medium text-violet-900">No one is sharing location right now</p>
                  <p className="max-w-sm text-sm text-gray-500">
                    Ask employees to turn on “Share my live location” from their dashboard. They’ll appear here within a
                    few seconds.
                  </p>
                </div>
              ) : (
                <LiveTrackingMap employees={employees} areas={areas} />
              )}
            </div>
          </Card>

          {/* Live employee list */}
          <Card className="border-violet-200 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-violet-900">
                <Users className="h-4 w-4 text-violet-600" />
                Active Employees
              </CardTitle>
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
                      className="flex items-center justify-between gap-2 rounded-lg border border-violet-100 p-2"
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
                        <p className="mt-1 flex items-start gap-1 text-[11px] text-gray-600">
                          <MapPin className="mt-[1px] h-3 w-3 shrink-0 text-violet-500" />
                          <span className="truncate">{areas[e.user.id] || "Locating area…"}</span>
                        </p>
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
