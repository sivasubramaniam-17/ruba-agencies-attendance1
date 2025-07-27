"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Clock, Calendar, TrendingUp, CheckCircle, XCircle, AlertCircle, DollarSign } from "lucide-react"

interface DashboardStatsProps {
  stats: {
    totalEmployees: number
    presentToday: number
    absentToday: number
    lateToday: number
    pendingLeaves: number
    totalSalaryPaid: number
    avgAttendanceRate: number
    topPerformer: string
  }
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const attendanceRate = (stats.presentToday / stats.totalEmployees) * 100

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Employees */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalEmployees}</div>
          <p className="text-xs text-muted-foreground">Active workforce</p>
        </CardContent>
      </Card>

      {/* Present Today */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Present Today</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.presentToday}</div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {attendanceRate.toFixed(1)}%
            </Badge>
            <p className="text-xs text-muted-foreground">attendance rate</p>
          </div>
        </CardContent>
      </Card>

      {/* Absent Today */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
          <XCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{stats.absentToday}</div>
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="text-xs">
              {stats.lateToday} late
            </Badge>
            <p className="text-xs text-muted-foreground">arrivals</p>
          </div>
        </CardContent>
      </Card>

      {/* Pending Leaves */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
          <Calendar className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{stats.pendingLeaves}</div>
          <p className="text-xs text-muted-foreground">Require approval</p>
        </CardContent>
      </Card>

      {/* Average Attendance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Attendance</CardTitle>
          <TrendingUp className="h-4 w-4 text-violet-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-violet-600">{stats.avgAttendanceRate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">This month</p>
        </CardContent>
      </Card>

      {/* Total Salary Paid */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Salary Paid</CardTitle>
          <DollarSign className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">${stats.totalSalaryPaid.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">This month</p>
        </CardContent>
      </Card>

      {/* Top Performer */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
          <AlertCircle className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-lg font-bold text-yellow-600">{stats.topPerformer}</div>
          <p className="text-xs text-muted-foreground">Highest attendance</p>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-2">
          <button className="w-full text-left text-sm text-violet-600 hover:underline">Generate Reports</button>
          <button className="w-full text-left text-sm text-violet-600 hover:underline">Approve Leaves</button>
          <button className="w-full text-left text-sm text-violet-600 hover:underline">Process Payroll</button>
        </CardContent>
      </Card>
    </div>
  )
}
