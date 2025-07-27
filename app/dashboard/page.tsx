"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DashboardStats } from "@/components/dashboard-stats"
import { AttendanceClock } from "@/components/attendance-clock"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Users, DollarSign, TrendingUp } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

interface DashboardData {
  stats?: {
    totalEmployees: number
    presentToday: number
    onLeave: number
    totalSalary: number
    pendingLeaves: number
    lateArrivals: number
    absentToday: number
    lateToday: number
    totalSalaryPaid: number
    avgAttendanceRate: number
    topPerformer: string
  }
  recentAttendance?: Array<{
    id: string
    date: string
    checkInTime: string | null
    checkOutTime: string | null
    status: string
    user: {
      firstName: string
      lastName: string
      employeeId: string
    }
  }>
  systemSettings?: {
    workingHoursStart: string
    workingHoursEnd: string
    breakDuration: number
  } | null
  todayAttendance?: any
  monthlyStats?: {
    totalDays: number
    totalHours: number
    overtimeHours: number
  }
  pendingLeaves?: number
  leaveBalance?: number
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    fetchDashboardData()

    return () => clearInterval(timer)
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/dashboard/stats")
      if (response.ok) {
        const data = await response.json()
        setDashboardData(data)
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const isAdmin = session?.user?.role === "ADMIN"

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-violet-200">
                <CardContent className="p-6">
                  <div className="h-20 bg-violet-100 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-violet-900">
              Welcome back, {session?.user?.name?.split(" ")?.[0] || "User"}!
            </h1>
            <p className="text-violet-600 mt-1">
              {format(currentTime, "EEEE, MMMM do, yyyy")} • {format(currentTime, "HH:mm:ss")}
            </p>
            {dashboardData?.systemSettings && (
              <p className="text-sm text-violet-500 mt-1">
                Working Hours: {dashboardData.systemSettings.workingHoursStart || "09:00"} -{" "}
                {dashboardData.systemSettings.workingHoursEnd || "17:00"}
              </p>
            )}
          </div>
          <Badge variant="outline" className="text-violet-700 border-violet-300">
            {isAdmin ? "Administrator" : "Employee"}
          </Badge>
        </div>

        {/* Stats Grid */}
        {isAdmin ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-violet-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-violet-600" />
                  <div>
                    <div className="text-2xl font-bold text-violet-900">
                      {dashboardData?.stats?.totalEmployees ?? 0}
                    </div>
                    <p className="text-xs text-violet-600">Total Employees</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold text-green-900">{dashboardData?.stats?.presentToday ?? 0}</div>
                    <p className="text-xs text-green-600">Present Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <div>
                    <div className="text-2xl font-bold text-orange-900">{dashboardData?.stats?.pendingLeaves ?? 0}</div>
                    <p className="text-xs text-orange-600">Pending Leaves</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold text-blue-900">
                      ${(dashboardData?.stats?.totalSalaryPaid ?? 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-blue-600">Monthly Payroll</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-violet-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-violet-600" />
                  <div>
                    <div className="text-2xl font-bold text-violet-900">
                      {dashboardData?.systemSettings?.workingHoursStart ?? "09:00"}
                    </div>
                    <p className="text-xs text-violet-600">Work Start Time</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-violet-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-violet-600" />
                  <div>
                    <div className="text-2xl font-bold text-violet-900">
                      {dashboardData?.systemSettings?.workingHoursEnd ?? "17:00"}
                    </div>
                    <p className="text-xs text-violet-600">Work End Time</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-violet-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-violet-600" />
                  <div>
                    <div className="text-2xl font-bold text-violet-900">
                      {dashboardData?.systemSettings?.breakDuration ?? 60}m
                    </div>
                    <p className="text-xs text-violet-600">Break Duration</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Attendance Clock - For Employees */}
          {!isAdmin && (
            <div className="lg:col-span-2">
              <AttendanceClock />
            </div>
          )}

          {/* Quick Actions */}
          <Card className="border-violet-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-violet-900">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isAdmin ? (
                <>
                  <Button asChild className="w-full justify-start bg-violet-600 hover:bg-violet-700">
                    <Link href="/admin/employees">
                      <Users className="mr-2 h-4 w-4" />
                      Manage Employees
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-start border-violet-300 text-violet-700 hover:bg-violet-50 bg-transparent"
                  >
                    <Link href="/admin/attendance">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      View Reports
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-start border-violet-300 text-violet-700 hover:bg-violet-50 bg-transparent"
                  >
                    <Link href="/admin/leaves">
                      <Calendar className="mr-2 h-4 w-4" />
                      Manage Leaves
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-start border-violet-300 text-violet-700 hover:bg-violet-50 bg-transparent"
                  >
                    <Link href="/admin/salary">
                      <DollarSign className="mr-2 h-4 w-4" />
                      Salary Management
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild className="w-full justify-start bg-violet-600 hover:bg-violet-700">
                    <Link href="/attendance">
                      <Clock className="mr-2 h-4 w-4" />
                      View My Attendance
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-start border-violet-300 text-violet-700 hover:bg-violet-50 bg-transparent"
                  >
                    <Link href="/leave">
                      <Calendar className="mr-2 h-4 w-4" />
                      Request Leave
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-start border-violet-300 text-violet-700 hover:bg-violet-50 bg-transparent"
                  >
                    <Link href="/profile">
                      <Users className="mr-2 h-4 w-4" />
                      Update Profile
                    </Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-violet-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-violet-900">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData?.recentAttendance?.length ? (
                <div className="space-y-3">
                  {dashboardData.recentAttendance.slice(0, 5).map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-violet-50 rounded-lg">
                      <div>
                        <div className="font-medium text-violet-900">
                          {record.user?.firstName || "Unknown"} {record.user?.lastName || ""}
                        </div>
                        <div className="text-sm text-violet-600">
                          {record.checkInTime ? format(new Date(record.checkInTime), "HH:mm") : "--:--"} -
                          {record.checkOutTime ? format(new Date(record.checkOutTime), "HH:mm") : "--:--"}
                        </div>
                      </div>
                      <Badge variant={record.status === "PRESENT" ? "default" : "secondary"}>{record.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-violet-600">No recent activity</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Admin Dashboard Stats */}
        {isAdmin && dashboardData?.stats && (
          <DashboardStats
            stats={{
              totalEmployees: dashboardData.stats.totalEmployees ?? 0,
              presentToday: dashboardData.stats.presentToday ?? 0,
              absentToday: dashboardData.stats.absentToday ?? 0,
              lateToday: dashboardData.stats.lateToday ?? 0,
              pendingLeaves: dashboardData.stats.pendingLeaves ?? 0,
              totalSalaryPaid: dashboardData.stats.totalSalaryPaid ?? 0,
              avgAttendanceRate: dashboardData.stats.avgAttendanceRate ?? 0,
              topPerformer: dashboardData.stats.topPerformer ?? "No data",
            }}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
