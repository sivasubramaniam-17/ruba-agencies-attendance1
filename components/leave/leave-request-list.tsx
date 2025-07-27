"use client"

import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FileText, Clock, Check, X } from "lucide-react"

interface LeaveRequest {
  id: string
  leaveType: string
  startDate: string
  endDate: string
  totalDays: number
  reason: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  isInformed: boolean
  createdAt: string
}

export function LeaveRequestList({ userId }: { userId: string }) {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLeaveRequests = async () => {
      try {
        const response = await fetch(`/api/leave`)
        if (response.ok) {
          const data = await response.json()
          setLeaveRequests(data.leaveRequests || [])
        }
      } catch (error) {
        console.error("Error fetching leave requests:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaveRequests()
  }, [userId])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-green-100 text-green-800"><Check className="h-3 w-3 mr-1" /> Approved</Badge>
      case "REJECTED":
        return <Badge className="bg-red-100 text-red-800"><X className="h-3 w-3 mr-1" /> Rejected</Badge>
      default:
        return <Badge className="bg-orange-100 text-orange-800"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>
    }
  }

  const getLeaveType = (type: string) => {
    switch (type) {
      case "SICK": return "🤒 Sick"
      case "CASUAL": return "😊 Casual"
      case "ANNUAL": return "🏖️ Annual"
      case "MATERNITY": return "👶 Maternity"
      case "PATERNITY": return "👨‍👶 Paternity"
      case "EMERGENCY": return "🚨 Emergency"
      case "UNPAID": return "💸 Unpaid"
      default: return type
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto"></div>
        <p className="mt-2 text-violet-600">Loading leave requests...</p>
      </div>
    )
  }

  if (leaveRequests.length === 0) {
    return (
      <div className="p-6 text-center">
        <FileText className="h-8 w-8 text-violet-400 mx-auto" />
        <p className="mt-2 text-violet-600">No leave requests found</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Dates</TableHead>
          <TableHead>Days</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Reason</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leaveRequests.map((request) => (
          <TableRow key={request.id}>
            <TableCell className="font-medium">{getLeaveType(request.leaveType)}</TableCell>
            <TableCell>
              {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
            </TableCell>
            <TableCell>{request.totalDays}</TableCell>
            <TableCell>{getStatusBadge(request.status)}</TableCell>
            <TableCell className="text-sm text-gray-600 max-w-xs truncate">{request.reason}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}