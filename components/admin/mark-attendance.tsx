"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, UserCheck, Clock, Save, Users, Calendar } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface Employee {
  id: string
  firstName: string
  lastName: string
  employeeId: string
  department: string
  position: string
}

interface AttendanceRecord {
  id: string
  date: string
  status: string
  checkInTime: string | null
  checkOutTime: string | null
  totalHours: number | null
  isLate: boolean
  notes: string | null
  isManualEntry: boolean
  user: {
    firstName: string
    lastName: string
    employeeId: string
  }
}

export function MarkAttendance() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"))
  const [attendanceData, setAttendanceData] = useState({
    status: "",
    checkInTime: "",
    checkOutTime: "",
    notes: "",
  })
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    fetchEmployees()
    fetchRecentRecords()
  }, [])

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/admin/employees?limit=100")
      if (response.ok) {
        const data = await response.json()
        setEmployees(data.employees || [])
      }
    } catch (error) {
      console.error("Error fetching employees:", error)
    }
  }

  const fetchRecentRecords = async () => {
    try {
      const response = await fetch("/api/admin/attendance?limit=10")
      if (response.ok) {
        const data = await response.json()
        setRecentRecords(data.records || [])
      }
    } catch (error) {
      console.error("Error fetching recent records:", error)
    }
  }

  const handleMarkAttendance = async () => {
    if (!selectedEmployee || !attendanceData.status) {
      toast({
        title: "Error",
        description: "Please select an employee and status",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/admin/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployee.employeeId,
          date: selectedDate,
          status: attendanceData.status,
          checkInTime: attendanceData.checkInTime || null,
          checkOutTime: attendanceData.checkOutTime || null,
          notes: attendanceData.notes || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: data.message,
        })
        setAttendanceData({ status: "", checkInTime: "", checkOutTime: "", notes: "" })
        setSelectedEmployee(null)
        setSearchTerm("")
        fetchRecentRecords()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to mark attendance",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark attendance",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string, isLate: boolean) => {
    if (status === "PRESENT") {
      return <Badge variant={isLate ? "destructive" : "default"}>{isLate ? "Late" : "Present"}</Badge>
    }

    const variants = {
      ABSENT: "destructive",
      LATE: "destructive",
      HALF_DAY: "secondary",
      HOLIDAY: "outline",
    } as const

    return <Badge variant={variants[status as keyof typeof variants] || "outline"}>{status.replace("_", " ")}</Badge>
  }

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-4 sm:space-y-6 p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-violet-900">Mark Attendance</h2>
          <p className="text-violet-600">Manually mark attendance for employees</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-violet-600">
          <Users className="h-4 w-4" />
          <span>{employees.length} Employees</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Mark Attendance Form */}
        <Card className="border-violet-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100">
            <CardTitle className="flex items-center gap-2 text-violet-900">
              <UserCheck className="h-5 w-5" />
              Mark Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            {/* Date Selection */}
            <div className="space-y-2">
              <Label className="text-violet-900 font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date
              </Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border-violet-200 focus:border-violet-500 focus:ring-violet-500"
              />
            </div>

            {/* Employee Search */}
            <div className="space-y-2">
              <Label className="text-violet-900 font-medium">Search Employee</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-violet-400 h-4 w-4" />
                <Input
                  placeholder="Search by name, ID, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-violet-200 focus:border-violet-500 focus:ring-violet-500"
                />
              </div>
            </div>

            {/* Employee Selection */}
            {searchTerm && (
              <div className="max-h-40 overflow-y-auto border border-violet-200 rounded-md bg-white">
                {filteredEmployees.length === 0 ? (
                  <div className="p-3 text-center text-gray-500">No employees found</div>
                ) : (
                  filteredEmployees.slice(0, 5).map((employee) => (
                    <div
                      key={employee.id}
                      className={cn(
                        "p-3 cursor-pointer hover:bg-violet-50 border-b border-violet-100 last:border-b-0 transition-colors",
                        selectedEmployee?.id === employee.id && "bg-violet-100",
                      )}
                      onClick={() => {
                        setSelectedEmployee(employee)
                        setSearchTerm(`${employee.firstName} ${employee.lastName} (${employee.employeeId})`)
                      }}
                    >
                      <div className="font-medium text-violet-900">
                        {employee.firstName} {employee.lastName}
                      </div>
                      <div className="text-sm text-violet-600">
                        {employee.employeeId} • {employee.department} • {employee.position}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Status Selection */}
            <div className="space-y-2">
              <Label className="text-violet-900 font-medium">Status</Label>
              <Select
                value={attendanceData.status}
                onValueChange={(value) => setAttendanceData((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="border-violet-200 focus:border-violet-500">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRESENT">Present</SelectItem>
                  <SelectItem value="ABSENT">Absent</SelectItem>
                  <SelectItem value="LATE">Late</SelectItem>
                  <SelectItem value="HALF_DAY">Half Day</SelectItem>
                  <SelectItem value="HOLIDAY">Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time Inputs */}
            {(attendanceData.status === "PRESENT" ||
              attendanceData.status === "LATE" ||
              attendanceData.status === "HALF_DAY") && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-violet-900 font-medium">Check In Time</Label>
                  <Input
                    type="time"
                    value={attendanceData.checkInTime}
                    onChange={(e) => setAttendanceData((prev) => ({ ...prev, checkInTime: e.target.value }))}
                    className="border-violet-200 focus:border-violet-500 focus:ring-violet-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-violet-900 font-medium">Check Out Time</Label>
                  <Input
                    type="time"
                    value={attendanceData.checkOutTime}
                    onChange={(e) => setAttendanceData((prev) => ({ ...prev, checkOutTime: e.target.value }))}
                    className="border-violet-200 focus:border-violet-500 focus:ring-violet-500"
                  />
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-violet-900 font-medium">Notes (Optional)</Label>
              <Textarea
                placeholder="Add any notes about this attendance entry..."
                value={attendanceData.notes}
                onChange={(e) => setAttendanceData((prev) => ({ ...prev, notes: e.target.value }))}
                className="border-violet-200 focus:border-violet-500 focus:ring-violet-500 min-h-[80px]"
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleMarkAttendance}
              disabled={loading || !selectedEmployee || !attendanceData.status}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
              size="lg"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Marking...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Mark Attendance
                </div>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Records */}
        <Card className="border-violet-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100">
            <CardTitle className="flex items-center gap-2 text-violet-900">
              <Clock className="h-5 w-5" />
              Recent Attendance Records
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-violet-50 z-10">
                  <TableRow className="border-b border-violet-200">
                    <TableHead className="text-violet-900 font-semibold">Employee</TableHead>
                    <TableHead className="text-violet-900 font-semibold">Date</TableHead>
                    <TableHead className="text-violet-900 font-semibold">Status</TableHead>
                    <TableHead className="text-violet-900 font-semibold hidden sm:table-cell">Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <div className="text-gray-500">No recent attendance records</div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentRecords.map((record) => (
                      <TableRow key={record.id} className="hover:bg-violet-50 border-b border-violet-100">
                        <TableCell>
                          <div>
                            <div className="font-medium text-violet-900">
                              {record.user?.firstName} {record.user?.lastName}
                            </div>
                            <div className="text-sm text-violet-600">{record.user?.employeeId}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{format(new Date(record.date), "MMM dd, yyyy")}</div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {getStatusBadge(record.status, record.isLate)}
                            {record.isManualEntry && (
                              <Badge variant="outline" className="text-xs">
                                Manual
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {record.totalHours ? (
                            <span className="font-medium">{record.totalHours.toFixed(1)}h</span>
                          ) : (
                            <span className="text-gray-400">-</span>
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
    </div>
  )
}
