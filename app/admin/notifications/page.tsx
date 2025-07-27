"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Notifications } from "@/components/admin/notifications"

export default function AdminNotificationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === "loading") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <div className="animate-pulse text-violet-600 text-lg">Loading notifications...</div>
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
      <div className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto">
        <Notifications />
      </div>
    </DashboardLayout>
  )
}
