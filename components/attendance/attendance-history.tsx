"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CalendarIcon, Clock, MapPin, Filter, Download } from "lucide-react"
import { format } from "date-fns"
import { formatTime } from "@/lib/utils"

interface AttendanceRecord {
  id: string
  date: string
  checkInTime: string | null
  checkOutTime: string | null
  totalHours: number | null
  status: string
  checkInLocation: string | null
  checkOutLocation: string | null
  checkInMethod: string
  isLate: boolean
  isEarlyLeave: boolean
}

export function AttendanceHistory() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  })

  useEffect(() => {
    fetchAttendanceHistory()
  }, [dateRange])

  const fetchAttendanceHistory = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        startDate: new Date(dateRange.from).toISOString(),
        endDate: new Date(dateRange.to).toISOString(),
        limit: "50",
      })

      const response = await fetch(`/api/attendance/history?${params}`)
      if (response.ok) {
        const data = await response.json()
        setRecords(data.records || [])
      }
    } catch (error) {
      console.error("Error fetching attendance history:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string, isLate: boolean) => {
    if (status === "PRESENT") {
      return (
        <Badge variant={isLate ? "destructive" : "default"} className="text-xs">
          {isLate ? "Late" : "Present"}
        </Badge>
      )
    }
    return (
      <Badge variant={status === "ABSENT" ? "destructive" : "secondary"} className="text-xs">
        {status}
      </Badge>
    )
  }

  const calculateTotalHours = () => {
    return records.filter((record) => record.totalHours).reduce((sum, record) => sum + (record.totalHours || 0), 0)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-violet-900">
            Attendance History
          </h2>
          <p className="text-sm sm:text-base text-violet-600 mt-1">Track your attendance records and patterns</p>
        </div>
        <Button variant="outline" className="w-full sm:w-auto border-violet-300 text-violet-700 hover:bg-violet-50">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-violet-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100">
          <CardTitle className="flex items-center gap-2 text-violet-900">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-violet-900 font-medium">From Date</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                  className="border-violet-200 focus:border-violet-500 focus:ring-violet-500 pl-10"
                />
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-violet-600" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-violet-900 font-medium">To Date</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                  className="border-violet-200 focus:border-violet-500 focus:ring-violet-500 pl-10"
                />
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-violet-600" />
              </div>
            </div>

            <div className="flex items-end">
              <Button
                onClick={fetchAttendanceHistory}
                disabled={loading}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
              >
                {loading ? "Loading..." : "Apply Filter"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-violet-200 shadow-lg">
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-2xl font-bold text-violet-900">{records.length}</div>
            <p className="text-xs sm:text-sm text-violet-600">Total Days</p>
          </CardContent>
        </Card>
        <Card className="border-violet-200 shadow-lg">
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-2xl font-bold text-green-600">
              {records.filter((r) => r.status === "PRESENT").length}
            </div>
            <p className="text-xs sm:text-sm text-violet-600">Present</p>
          </CardContent>
        </Card>
        <Card className="border-violet-200 shadow-lg">
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-2xl font-bold text-red-600">
              {records.filter((r) => r.status === "ABSENT").length}
            </div>
            <p className="text-xs sm:text-sm text-violet-600">Absent</p>
          </CardContent>
        </Card>
        <Card className="border-violet-200 shadow-lg">
          <CardContent className="p-3 sm:p-4">
            <div className="text-lg sm:text-2xl font-bold text-blue-600">{calculateTotalHours().toFixed(1)}h</div>
            <p className="text-xs sm:text-sm text-violet-600">Total Hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Records Table */}
      <Card className="border-violet-200 shadow-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="mobile-table">
              <TableHeader className="bg-violet-50">
                <TableRow>
                  <TableHead className="text-violet-900 font-semibold">Date</TableHead>
                  <TableHead className="text-violet-900 font-semibold">Check In</TableHead>
                  <TableHead className="text-violet-900 font-semibold">Check Out</TableHead>
                  <TableHead className="text-violet-900 font-semibold">Hours</TableHead>
                  <TableHead className="text-violet-900 font-semibold">Status</TableHead>
                  <TableHead className="text-violet-900 font-semibold">Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="animate-pulse text-violet-600">Loading attendance records...</div>
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-gray-500">No attendance records found for the selected period</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow key={record.id} className="hover:bg-violet-50">
                      <TableCell data-label="Date">
                        <div className="font-medium text-violet-900">
                          {format(new Date(record.date), "MMM dd, yyyy")}
                        </div>
                        <div className="text-xs text-violet-600 sm:hidden">{format(new Date(record.date), "EEEE")}</div>
                      </TableCell>
                      <TableCell data-label="Check In">
                        {record.checkInTime ? (
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                            <span className="text-sm">{formatTime(new Date(record.checkInTime))}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell data-label="Check Out">
                        {record.checkOutTime ? (
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                            <span className="text-sm">{formatTime(new Date(record.checkOutTime))}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell data-label="Hours">
                        <span className="font-medium">
                          {record.totalHours ? `${record.totalHours.toFixed(1)}h` : "-"}
                        </span>
                      </TableCell>
                      <TableCell data-label="Status">{getStatusBadge(record.status, record.isLate)}</TableCell>
                      <TableCell data-label="Method">
                        <Badge variant="outline" className="text-xs border-violet-300 text-violet-700">
                          {record.checkInMethod.replace("_", " ")}
                        </Badge>
                        {record.checkInLocation && (
                          <div className="flex items-center gap-1 text-xs text-violet-600 mt-1">
                            <MapPin className="h-3 w-3" />
                            Location
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
