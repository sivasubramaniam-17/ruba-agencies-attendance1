"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { EmployeeList } from "@/components/admin/employee-list"
import { EmployeeForm } from "@/components/admin/employee-form"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

interface Employee {
  id: string
  email: string
  firstName: string
  lastName: string
  employeeId: string
  department: string
  position: string
  role: string
  salary: number
  joinDate: string
  isActive: boolean
  phone?: string
  address?: string
  emergencyContact?: string
}

export default function AdminEmployeesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Redirect if not admin or HR
  if (status === "loading") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <div className="animate-pulse text-violet-600 text-lg">Loading employees...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "HR")) {
    router.push("/dashboard")
    return null
  }

  const handleAddEmployee = () => {
    setEditingEmployee(null)
    setShowForm(true)
  }

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee({
      ...employee,
      joinDate: new Date(employee.joinDate).toISOString(),
    })
    setShowForm(true)
  }

  const handleViewEmployee = (employee: Employee) => {
    router.push(`/admin/employees/${employee.id}`)
  }

  const handleDeleteEmployee = async (employee: Employee) => {
    if (!confirm(`Are you sure you want to deactivate ${employee.firstName} ${employee.lastName}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/employees/${employee.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Employee deactivated successfully",
        })
        // Refresh the list
        window.location.reload()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to deactivate employee",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while deactivating the employee",
        variant: "destructive",
      })
    }
  }

  const handleFormSubmit = async (data: any) => {
    setIsLoading(true)
    try {
      const url = editingEmployee ? `/api/admin/employees/${editingEmployee.id}` : "/api/admin/employees"
      const method = editingEmployee ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Employee ${editingEmployee ? "updated" : "created"} successfully`,
        })
        setShowForm(false)
        setEditingEmployee(null)
        // Refresh the list
        window.location.reload()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || `Failed to ${editingEmployee ? "update" : "create"} employee`,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while saving the employee",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingEmployee(null)
  }

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto">
        <EmployeeList
          onAddEmployee={handleAddEmployee}
          onEditEmployee={handleEditEmployee}
          onViewEmployee={handleViewEmployee}
          onDeleteEmployee={handleDeleteEmployee}
        />
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? "Edit Employee" : "Add New Employee"}</DialogTitle>
          </DialogHeader>
          <EmployeeForm
            employee={editingEmployee}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            isLoading={isLoading}
          />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
