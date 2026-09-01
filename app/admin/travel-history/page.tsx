"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Route } from "lucide-react"

interface HistEmployee {
  user: { id: string; firstName: string; lastName: string; employeeId: string; department: string }
  days: { date: string; km: number }[]
  totalKm: number
}

export default function TravelHistoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isAdminOrHr = session && (session.user.role === "ADMIN" || session.user.role === "HR")

  const { data, isLoading } = useSWR<{ employees: HistEmployee[] }>(
    isAdminOrHr ? "/api/location/history" : null,
    { refreshInterval: 300000, revalidateOnFocus: true },
  )

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

  const employees = data?.employees ?? []

  return (
    <DashboardLayout>
      <div className="space-y-4 p-3 sm:p-4 lg:p-6">
        <PageHeader
          title="Travel History"
          subtitle="Daily distance travelled per employee (last 30 days)"
          icon={Route}
        />

        {isLoading && !data ? (
          <Card className="border-violet-100">
            <CardContent className="py-10 text-center text-violet-500">Loading travel history…</CardContent>
          </Card>
        ) : employees.length === 0 ? (
          <Card className="border-violet-100">
            <CardContent className="py-10 text-center text-gray-400">
              No travel recorded yet. Distances appear here once employees share location.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {employees.map((e) => {
              const max = Math.max(1, ...e.days.map((d) => d.km))
              return (
                <Card key={e.user.id} className="border-violet-100">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-violet-900">
                          {e.user.firstName} {e.user.lastName}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {e.user.employeeId} · {e.user.department}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-gradient-to-r from-violet-100 to-fuchsia-100 px-3 py-1 text-sm font-semibold text-violet-700">
                        🚶 {e.totalKm} km
                      </span>
                    </div>

                    <div className="mt-4 space-y-1.5">
                      {e.days.map((d) => (
                        <div key={d.date} className="flex items-center gap-2 text-xs">
                          <span className="w-16 shrink-0 text-gray-500">
                            {new Date(d.date).toLocaleDateString([], { day: "2-digit", month: "short" })}
                          </span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-violet-50">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                              style={{ width: `${(d.km / max) * 100}%` }}
                            />
                          </div>
                          <span className="w-14 shrink-0 text-right font-medium text-violet-900">{d.km} km</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
