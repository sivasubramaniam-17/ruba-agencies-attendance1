"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Loader2, User, Briefcase, Lock, Phone, MapPin } from "lucide-react"

interface Employee {
  id?: string
  email: string
  firstName: string
  lastName: string
  employeeId: string
  department: string
  position: string
  role: string
  salary?: number
  joinDate: Date | string
  phone?: string
  address?: string
  emergencyContact?: string
  isActive: boolean
}

interface EmployeeFormProps {
  employee?: Employee | null
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function EmployeeForm({ employee, onSubmit, onCancel, isLoading }: EmployeeFormProps) {
  const [formData, setFormData] = useState({
    email: employee?.email || "",
    firstName: employee?.firstName || "",
    lastName: employee?.lastName || "",
    employeeId: employee?.employeeId || "",
    department: employee?.department || "",
    position: employee?.position || "",
    role: employee?.role || "EMPLOYEE",
    salary: employee?.salary?.toString() || "",
    joinDate: employee?.joinDate
      ? new Date(employee.joinDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    phone: employee?.phone || "",
    address: employee?.address || "",
    emergencyContact: employee?.emergencyContact || "",
    isActive: employee?.isActive ?? true,
    password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.employeeId) {
      return
    }

    await onSubmit(formData)
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card className="border-violet-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100">
          <CardTitle className="text-xl text-violet-900">{employee ? "Edit Employee" : "Add New Employee"}</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold text-violet-900 border-b border-violet-100 pb-2">
                <User className="h-5 w-5" />
                Personal Information
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-violet-900 font-medium">
                    First Name *
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    required
                    className="border-violet-200 focus:border-violet-500 focus:ring-violet-500"
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-violet-900 font-medium">
                    Last Name *
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    required
                    className="border-violet-200 focus:border-violet-500 focus:ring-violet-500"
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-violet-900 font-medium">
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                  className="border-violet-200 focus:border-violet-500 focus:ring-violet-500"
                  placeholder="Enter email address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-violet-900 font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className="border-violet-200 focus:border-violet-500 focus:ring-violet-500"
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContact" className="text-violet-900 font-medium">
                    Emergency Contact
                  </Label>
                  <Input
                    id="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={(e) => handleInputChange("emergencyContact", e.target.value)}
                    className="border-violet-200 focus:border-violet-500 focus:ring-violet-500"
                    placeholder="Enter emergency contact"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-violet-900 font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Address
                </Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  rows={3}
                  className="border-violet-200 focus:border-violet-500 focus:ring-violet-500"
                  placeholder="Enter full address"
                />
              </div>
            </div>

            {/* Employment Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold text-violet-900 border-b border-violet-100 pb-2">
                <Briefcase className="h-5 w-5" />
                Employment Information
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeId" className="text-violet-900 font-medium">
                    Employee ID *
                  </Label>
                  <Input
                    id="employeeId"
                    value={formData.employeeId}
                    onChange={(e) => handleInputChange("employeeId", e.target.value)}
                    required
                    className="border-violet-200 focus:border-violet-500 focus:ring-violet-500"
                    placeholder="Enter employee ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department" className="text-violet-900 font-medium">
                    Department *
                  </Label>
                  <Select value={formData.department} onValueChange={(value) => handleInputChange("department", value)}>
                    <SelectTrigger className="border-violet-200 focus:border-violet-500">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Engineering">Engineering</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Human Resources">Human Resources</SelectItem>
                      <SelectItem value="Sales">Sales</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="position" className="text-violet-900 font-medium">
                    Position *
                  </Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => handleInputChange("position", e.target.value)}
                    required
                    className="border-violet-200 focus:border-violet-500 focus:ring-violet-500"
                    placeholder="Enter position/job title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-violet-900 font-medium">
                    Role *
                  </Label>
                  <Select value={formData.role} onValueChange={(value) => handleInputChange("role", value)}>
                    <SelectTrigger className="border-violet-200 focus:border-violet-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPLOYEE">Employee</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salary" className="text-violet-900 font-medium">
                    Salary
                  </Label>
                  <Input
                    id="salary"
                    type="number"
                    step="0.01"
                    value={formData.salary}
                    onChange={(e) => handleInputChange("salary", e.target.value)}
                    className="border-violet-200 focus:border-violet-500 focus:ring-violet-500"
                    placeholder="Enter salary amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="joinDate" className="text-violet-900 font-medium">
                    Join Date *
                  </Label>
                  <Input
                    id="joinDate"
                    type="date"
                    value={formData.joinDate}
                    onChange={(e) => handleInputChange("joinDate", e.target.value)}
                    required
                    className="border-violet-200 focus:border-violet-500 focus:ring-violet-500"
                  />
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold text-violet-900 border-b border-violet-100 pb-2">
                <Lock className="h-5 w-5" />
                Security & Access
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-violet-900 font-medium">
                  {employee ? "New Password (leave blank to keep current)" : "Password *"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  required={!employee}
                  className="border-violet-200 focus:border-violet-500 focus:ring-violet-500"
                  placeholder={employee ? "Enter new password" : "Enter password"}
                />
              </div>

              {employee && (
                <div className="flex items-center space-x-2 p-4 bg-violet-50 rounded-lg border border-violet-200">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => handleInputChange("isActive", checked)}
                  />
                  <Label htmlFor="isActive" className="text-violet-900 font-medium">
                    Active Employee
                  </Label>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-violet-100">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
                size="lg"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {employee ? "Update Employee" : "Create Employee"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1 border-violet-300 text-violet-700 hover:bg-violet-50 bg-transparent"
                size="lg"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
