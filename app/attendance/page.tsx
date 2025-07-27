import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AttendanceClock } from "@/components/attendance-clock"
import { AttendanceHistory } from "@/components/attendance/attendance-history"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, History, Calendar, TrendingUp } from "lucide-react"
import { prisma } from "@/lib/prisma"

async function getAttendanceStats(userId: string) {
  const currentMonth = new Date()
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

  const [monthlyRecords, todayRecord] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: {
        userId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    }),
    prisma.attendanceRecord.findFirst({
      where: {
        userId,
        date: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    }),
  ])

  const presentDays = monthlyRecords.filter((r) => r.status === "PRESENT" || r.status === "LATE").length
  const absentDays = monthlyRecords.filter((r) => r.status === "ABSENT").length
  const lateDays = monthlyRecords.filter((r) => r.isLate).length
  const totalHours = monthlyRecords.reduce((sum, record) => sum + (record.totalHours || 0), 0)
  const attendanceRate = monthlyRecords.length > 0 ? (presentDays / monthlyRecords.length) * 100 : 0

  return {
    presentDays,
    absentDays,
    lateDays,
    totalHours: Math.round(totalHours * 10) / 10,
    attendanceRate: Math.round(attendanceRate * 10) / 10,
    todayRecord,
  }
}

export default async function AttendancePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/auth/signin")
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { id: true, firstName: true, lastName: true },
  })

  if (!user) {
    redirect("/auth/signin")
  }

  const stats = await getAttendanceStats(user.id)

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-violet-900">Attendance</h1>
            <p className="text-violet-600 text-sm sm:text-base">Track your daily attendance and view your history</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-violet-600">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Attendance Clock */}
          <div className="lg:col-span-2">
            <Card className="border-violet-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100">
                <CardTitle className="flex items-center gap-2 text-violet-900">
                  <Clock className="h-5 w-5" />
                  Attendance Clock
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <AttendanceClock />
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            <Card className="border-violet-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100">
                <CardTitle className="flex items-center gap-2 text-violet-900">
                  <TrendingUp className="h-5 w-5" />
                  This Month
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
                    <div className="text-xl font-bold text-green-600">{stats.presentDays}</div>
                    <div className="text-xs text-green-700">Present</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
                    <div className="text-xl font-bold text-red-600">{stats.absentDays}</div>
                    <div className="text-xs text-red-700">Absent</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200">
                    <div className="text-xl font-bold text-orange-600">{stats.lateDays}</div>
                    <div className="text-xs text-orange-700">Late</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                    <div className="text-xl font-bold text-blue-600">{stats.totalHours}h</div>
                    <div className="text-xs text-blue-700">Total</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-violet-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-violet-700">Attendance Rate</span>
                    <span className="text-lg font-bold text-violet-900">{stats.attendanceRate}%</span>
                  </div>
                  <div className="w-full bg-violet-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-gradient-to-r from-violet-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stats.attendanceRate}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-violet-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100">
                <CardTitle className="flex items-center gap-2 text-violet-900">
                  <Clock className="h-5 w-5" />
                  Today's Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-violet-700">Check In</span>
                  <span className="font-medium text-violet-900">
                    {stats.todayRecord?.checkInTime
                      ? new Date(stats.todayRecord.checkInTime).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Not checked in"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-violet-700">Check Out</span>
                  <span className="font-medium text-violet-900">
                    {stats.todayRecord?.checkOutTime
                      ? new Date(stats.todayRecord.checkOutTime).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Not checked out"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-violet-700">Hours Worked</span>
                  <span className="font-medium text-violet-900">
                    {stats.todayRecord?.totalHours ? `${stats.todayRecord.totalHours.toFixed(1)}h` : "0h"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-violet-700">Status</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      stats.todayRecord?.status === "PRESENT"
                        ? "bg-green-100 text-green-800"
                        : stats.todayRecord?.status === "LATE"
                          ? "bg-orange-100 text-orange-800"
                          : stats.todayRecord?.status === "ABSENT"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {stats.todayRecord?.status || "Not marked"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Attendance History */}
        <Card className="border-violet-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100">
            <CardTitle className="flex items-center gap-2 text-violet-900">
              <History className="h-5 w-5" />
              Attendance History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AttendanceHistory />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
