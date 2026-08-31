"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { DashboardLayout } from "@/components/layout/dashboard-layout"

// Lazy-load the heavy reports view (calendars, date-fns, CSV export) so it
// splits into its own chunk instead of bloating the initial page bundle.
const AttendanceReports = dynamic(
  () => import("@/components/admin/attendance-reports").then((m) => m.AttendanceReports),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <div className="animate-pulse text-violet-600 text-lg">Loading attendance reports...</div>
      </div>
    ),
  },
)

export default function AdminAttendancePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === "loading") {
    return <div>Loading...</div>
  }

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "HR")) {
    router.push("/dashboard")
    return null
  }

  return (
    <DashboardLayout>
      <AttendanceReports />
    </DashboardLayout>
  )
}
