"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Download, Filter, BarChart3, Clock, Users, TrendingUp, Search } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface AttendanceRecord {
  id: string
  date: string
  checkInTime: string | null
  checkOutTime: string | null
  totalHours: number | null
  status: string
  isLate: boolean
  checkInMethod: string
  user: {
    firstName: string
    lastName: string
    employeeId: string
    department: string
    position: string
  }
}

interface AttendanceSummary {
  totalRecords: number
  presentCount: number
  absentCount: number
  lateCount: number
  totalHours: number
  averageHours: number
}

export function AttendanceReports() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [summary, setSummary] = useState<AttendanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date(),
    department: "",
    employeeId: "",
  })
  const [showStartCalendar, setShowStartCalendar] = useState(false)
  const [showEndCalendar, setShowEndCalendar] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchAttendanceReports()
  }, [filters])

  const fetchAttendanceReports = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        startDate: filters.startDate.toISOString(),
        endDate: filters.endDate.toISOString(),
        ...(filters.department && { department: filters.department }),
        ...(filters.employeeId && { employeeId: filters.employeeId }),
      })

      const response = await fetch(`/api/admin/attendance?${params}`)
      if (response.ok) {
        const data = await response.json()
        setRecords(data.records || [])
        setSummary(data.summary || null)
      }
    } catch (error) {
      console.error("Error fetching attendance reports:", error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    const headers = ["Date", "Employee ID", "Name", "Department", "Check In", "Check Out", "Total Hours", "Status"]
    const csvData = records.map((record) => [
      format(new Date(record.date), "yyyy-MM-dd"),
      record.user.employeeId,
      `${record.user.firstName} ${record.user.lastName}`,
      record.user.department,
      record.checkInTime ? format(new Date(record.checkInTime), "HH:mm") : "-",
      record.checkOutTime ? format(new Date(record.checkOutTime), "HH:mm") : "-",
      record.totalHours || "-",
      record.status,
    ])

    const csvContent = [headers, ...csvData].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `attendance-report-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getStatusBadge = (status: string, isLate: boolean) => {
    if (status === "PRESENT") {
      return <Badge variant={isLate ? "destructive" : "default"}>{isLate ? "Late" : "Present"}</Badge>
    }
    return <Badge variant={status === "ABSENT" ? "destructive" : "secondary"}>{status}</Badge>
  }

  const filteredRecords = records.filter((record) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      record.user.firstName.toLowerCase().includes(searchLower) ||
      record.user.lastName.toLowerCase().includes(searchLower) ||
      record.user.employeeId.toLowerCase().includes(searchLower) ||
      record.user.department.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="space-y-4 sm:space-y-6 p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-violet-900">Attendance Reports</h2>
          <p className="text-violet-600">Comprehensive attendance analytics and reports</p>
        </div>
        <Button
          onClick={exportToCSV}
          disabled={records.length === 0}
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-violet-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100">
          <CardTitle className="flex items-center gap-2 text-violet-900">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-violet-400 h-4 w-4" />
            <Input
              placeholder="Search by name, employee ID, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-violet-200 focus:border-violet-500 focus:ring-violet-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-violet-900 font-medium">Start Date</Label>
              <Popover open={showStartCalendar} onOpenChange={setShowStartCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-violet-200 hover:bg-violet-50",
                      !filters.startDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-violet-600" />
                    {filters.startDate ? format(filters.startDate, "PPP") : <span>Pick start date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) => {
                      if (date) {
                        setFilters((prev) => ({ ...prev, startDate: date }))
                      }
                      setShowStartCalendar(false)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-violet-900 font-medium">End Date</Label>
              <Popover open={showEndCalendar} onOpenChange={setShowEndCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-violet-200 hover:bg-violet-50",
                      !filters.endDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-violet-600" />
                    {filters.endDate ? format(filters.endDate, "PPP") : <span>Pick end date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.endDate}
                    onSelect={(date) => {
                      if (date) {
                        setFilters((prev) => ({ ...prev, endDate: date }))
                      }
                      setShowEndCalendar(false)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department" className="text-violet-900 font-medium">
                Department
              </Label>
              <Select
                value={filters.department}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, department: value === "all" ? "" : value }))}
              >
                <SelectTrigger className="border-violet-200 focus:border-violet-500">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Human Resources">Human Resources</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeId" className="text-violet-900 font-medium">
                Employee ID
              </Label>
              <Input
                id="employeeId"
                placeholder="Search by Employee ID"
                value={filters.employeeId}
                onChange={(e) => setFilters((prev) => ({ ...prev, employeeId: e.target.value }))}
                className="border-violet-200 focus:border-violet-500 focus:ring-violet-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-violet-200 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold text-blue-600">{summary.totalRecords}</div>
                  <p className="text-xs text-blue-700 font-medium">Total Records</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-violet-200 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-green-600">{summary.presentCount}</div>
                  <p className="text-xs text-green-700 font-medium">Present</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-violet-200 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold text-orange-600">{summary.lateCount}</div>
                  <p className="text-xs text-orange-700 font-medium">Late</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-violet-200 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-violet-600" />
                <div>
                  <div className="text-2xl font-bold text-violet-600">{summary.averageHours.toFixed(1)}h</div>
                  <p className="text-xs text-violet-700 font-medium">Avg Hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Records Table */}
      <Card className="border-violet-200 shadow-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-violet-50 border-b border-violet-200">
                  <TableHead className="text-violet-900 font-semibold">Date</TableHead>
                  <TableHead className="text-violet-900 font-semibold">Employee</TableHead>
                  <TableHead className="text-violet-900 font-semibold hidden sm:table-cell">Department</TableHead>
                  <TableHead className="text-violet-900 font-semibold">Check In</TableHead>
                  <TableHead className="text-violet-900 font-semibold">Check Out</TableHead>
                  <TableHead className="text-violet-900 font-semibold hidden lg:table-cell">Hours</TableHead>
                  <TableHead className="text-violet-900 font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600"></div>
                        <span className="text-violet-600">Loading attendance records...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-gray-500">
                        {searchTerm
                          ? `No records found matching "${searchTerm}"`
                          : "No attendance records found for the selected criteria"}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id} className="hover:bg-violet-50 border-b border-violet-100">
                      <TableCell>
                        <div className="font-medium text-violet-900">{format(new Date(record.date), "MMM dd")}</div>
                        <div className="text-sm text-violet-600 sm:hidden">{format(new Date(record.date), "yyyy")}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-violet-900">
                            {record.user.firstName} {record.user.lastName}
                          </div>
                          <div className="text-sm text-violet-600">{record.user.employeeId}</div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div>
                          <div className="font-medium text-violet-900">{record.user.department}</div>
                          <div className="text-sm text-violet-600">{record.user.position}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.checkInTime ? (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-green-600" />
                            <span className="text-sm font-medium">{format(new Date(record.checkInTime), "HH:mm")}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.checkOutTime ? (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-blue-600" />
                            <span className="text-sm font-medium">
                              {format(new Date(record.checkOutTime), "HH:mm")}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {record.totalHours ? (
                          <span className="font-medium">{record.totalHours}h</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status, record.isLate)}</TableCell>
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
