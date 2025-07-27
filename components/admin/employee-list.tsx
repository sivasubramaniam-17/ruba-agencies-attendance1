"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, MoreHorizontal, Edit, Trash2, Search, Filter, Users, UserCheck, UserX, Eye } from "lucide-react"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"

interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string
  employeeId: string
  department: string
  position: string
  role: string
  phone?: string
  joinDate: string
  salary?: number
  isActive: boolean
  _count?: {
    attendanceRecords: number
    leaveRequests: number
  }
}

interface EmployeeListProps {
  onAddEmployee: () => void
  onEditEmployee: (employee: Employee) => void
  onViewEmployee: (employee: Employee) => void
  onDeleteEmployee: (employee: Employee) => void
}

export function EmployeeList({ onAddEmployee, onEditEmployee, onViewEmployee, onDeleteEmployee }: EmployeeListProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [roleFilter, setRoleFilter] = useState("all")
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchEmployees()
  }, [pagination.page, searchTerm, departmentFilter, roleFilter])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(departmentFilter !== "all" && { department: departmentFilter }),
        ...(roleFilter !== "all" && { role: roleFilter }),
      })

      const response = await fetch(`/api/admin/employees?${params}`)
      if (response.ok) {
        const data = await response.json()
        setEmployees(data.employees || [])
        setPagination(data.pagination || pagination)
      } else {
        throw new Error("Failed to fetch employees")
      }
    } catch (error) {
      console.error("Error fetching employees:", error)
      toast({
        title: "Error",
        description: "Failed to fetch employees",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleFilterChange = (type: "department" | "role", value: string) => {
    if (type === "department") {
      setDepartmentFilter(value)
    } else {
      setRoleFilter(value)
    }
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const clearFilters = () => {
    setSearchTerm("")
    setDepartmentFilter("all")
    setRoleFilter("all")
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const getRoleBadge = (role: string) => {
    const colors = {
      ADMIN: "bg-red-100 text-red-800 border-red-200",
      HR: "bg-blue-100 text-blue-800 border-blue-200",
      MANAGER: "bg-purple-100 text-purple-800 border-purple-200",
      EMPLOYEE: "bg-green-100 text-green-800 border-green-200",
    }

    return (
      <Badge variant="outline" className={colors[role as keyof typeof colors] || ""}>
        {role}
      </Badge>
    )
  }

  const activeEmployees = employees.filter((emp) => emp.isActive).length
  const inactiveEmployees = employees.filter((emp) => !emp.isActive).length
  const totalDepartments = new Set(employees.map((emp) => emp.department)).size

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-violet-900">Employee Management</h2>
          <p className="text-violet-600 mt-1">Manage employee records and information</p>
        </div>
        <Button
          onClick={onAddEmployee}
          className="w-full lg:w-auto bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
          size="lg"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-violet-200 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 rounded-lg">
                <Users className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-violet-900">{pagination.total}</div>
                <p className="text-sm text-violet-600">Total Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{activeEmployees}</div>
                <p className="text-sm text-violet-600">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <UserX className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{inactiveEmployees}</div>
                <p className="text-sm text-violet-600">Inactive</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{totalDepartments}</div>
                <p className="text-sm text-violet-600">Departments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-violet-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100">
          <CardTitle className="flex items-center gap-2 text-violet-900">
            <Filter className="h-5 w-5" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-violet-400" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 border-violet-200 focus:border-violet-500 focus:ring-violet-500"
              />
            </div>
            <Select value={departmentFilter} onValueChange={(value) => handleFilterChange("department", value)}>
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
                <SelectItem value="Operations">Operations</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={(value) => handleFilterChange("role", value)}>
              <SelectTrigger className="border-violet-200 focus:border-violet-500">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="HR">HR</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="EMPLOYEE">Employee</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={clearFilters}
              className="border-violet-300 text-violet-700 hover:bg-violet-50 bg-transparent"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card className="border-violet-200 shadow-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-violet-50">
                <TableRow>
                  <TableHead className="text-violet-900 font-semibold">Employee</TableHead>
                  <TableHead className="text-violet-900 font-semibold">Department</TableHead>
                  <TableHead className="text-violet-900 font-semibold">Role</TableHead>
                  <TableHead className="text-violet-900 font-semibold">Join Date</TableHead>
                  <TableHead className="text-violet-900 font-semibold">Status</TableHead>
                  <TableHead className="text-violet-900 font-semibold hidden lg:table-cell">Activity</TableHead>
                  <TableHead className="text-violet-900 font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600"></div>
                        <span className="text-violet-600">Loading employees...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-gray-500">
                        {searchTerm || departmentFilter !== "all" || roleFilter !== "all"
                          ? "No employees found matching your criteria"
                          : "No employees found"}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((employee) => (
                    <TableRow key={employee.id} className="hover:bg-violet-50 transition-colors">
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-violet-900">
                            {employee.firstName} {employee.lastName}
                          </div>
                          <div className="text-sm text-violet-600">{employee.email}</div>
                          <div className="text-xs text-gray-500">{employee.employeeId}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{employee.department}</div>
                          <div className="text-sm text-gray-600">{employee.position}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(employee.role)}</TableCell>
                      <TableCell>
                        <div className="text-sm">{format(new Date(employee.joinDate), "MMM dd, yyyy")}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.isActive ? "default" : "secondary"}>
                          {employee.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="text-xs space-y-1">
                          <div>Attendance: {employee._count?.attendanceRecords || 0}</div>
                          <div>Leaves: {employee._count?.leaveRequests || 0}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => onViewEmployee(employee)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEditEmployee(employee)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDeleteEmployee(employee)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {employee.isActive ? "Deactivate" : "Delete"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-violet-100">
              <div className="text-sm text-gray-600">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} employees
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="border-violet-300 text-violet-700 hover:bg-violet-50"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                  className="border-violet-300 text-violet-700 hover:bg-violet-50"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
