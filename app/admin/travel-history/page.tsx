"use client"

import { useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Route, Download } from "lucide-react"

interface HistEmployee {
  user: { id: string; firstName: string; lastName: string; employeeId: string; department: string }
  days: { date: string; km: number }[]
  totalKm: number
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString([], { day: "2-digit", month: "short" })

// Quote a CSV cell if it needs it.
const csvCell = (v: string | number) => {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export default function TravelHistoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isAdminOrHr = session && (session.user.role === "ADMIN" || session.user.role === "HR")

  const { data, isLoading } = useSWR<{ employees: HistEmployee[] }>(
    isAdminOrHr ? "/api/location/history" : null,
    { refreshInterval: 300000, revalidateOnFocus: true },
  )

  const employees = useMemo(() => data?.employees ?? [], [data])

  // All dates that appear, newest first — these become the table columns.
  const dates = useMemo(() => {
    const set = new Set<string>()
    employees.forEach((e) => e.days.forEach((d) => set.add(d.date)))
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1))
  }, [employees])

  // Quick lookup: kmByUserDate[userId][date]
  const kmByUser = useMemo(() => {
    const m: Record<string, Record<string, number>> = {}
    employees.forEach((e) => {
      m[e.user.id] = {}
      e.days.forEach((d) => (m[e.user.id][d.date] = d.km))
    })
    return m
  }, [employees])

  const exportCsv = () => {
    const header = ["Employee", "Employee ID", "Department", ...dates.map(fmtDate), "Total (km)"]
    const rows = employees.map((e) => [
      `${e.user.firstName} ${e.user.lastName}`,
      e.user.employeeId,
      e.user.department,
      ...dates.map((d) => kmByUser[e.user.id]?.[d] ?? 0),
      e.totalKm,
    ])
    const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `travel-history-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

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
          title="Travel History"
          subtitle="Daily distance travelled per employee (last 30 days)"
          icon={Route}
          actions={
            <Button
              onClick={exportCsv}
              disabled={employees.length === 0}
              className="bg-white font-semibold text-violet-700 shadow-sm hover:bg-violet-50 disabled:opacity-60"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          }
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
          <Card className="overflow-hidden border-violet-100">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="bg-violet-50 text-left text-xs uppercase tracking-wide text-violet-700">
                    <th className="sticky left-0 z-10 bg-violet-50 px-4 py-3 font-semibold">Employee</th>
                    {dates.map((d) => (
                      <th key={d} className="whitespace-nowrap px-3 py-3 text-right font-semibold">
                        {fmtDate(d)}
                      </th>
                    ))}
                    <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e, i) => (
                    <tr key={e.user.id} className={i % 2 ? "bg-white" : "bg-violet-50/30"}>
                      <td className="sticky left-0 z-10 bg-inherit px-4 py-2.5">
                        <div className="font-medium text-violet-900">
                          {e.user.firstName} {e.user.lastName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {e.user.employeeId} · {e.user.department}
                        </div>
                      </td>
                      {dates.map((d) => {
                        const km = kmByUser[e.user.id]?.[d]
                        return (
                          <td key={d} className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-gray-700">
                            {km != null ? (km > 0 ? `${km}` : "—") : "—"}
                          </td>
                        )
                      })}
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold text-violet-900 tabular-nums">
                        {e.totalKm} km
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <p className="text-xs text-gray-400">Distances are in kilometres. GPS jitter and unreliable fixes are filtered out.</p>
      </div>
    </DashboardLayout>
  )
}
