"use client"

import { useState } from "react"
import { LateRequestForm } from "@/components/late-approval/late-request-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle, AlertCircle } from "lucide-react"

export default function LateApprovalPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Clock className="h-8 w-8 text-orange-600" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-orange-900">Late Arrival Approval</h1>
          <p className="text-orange-600">Request approval for late arrivals to avoid salary deductions</p>
        </div>
      </div>

      {/* Policy Information */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">Late Arrival Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">Automatic Deductions</span>
              </div>
              <ul className="space-y-1 text-blue-800 list-disc list-inside ml-6">
                <li>Hourly salary deduction for any late arrival</li>
                <li>No grace period - immediate deduction</li>
                <li>Deduction calculated based on actual late hours</li>
              </ul>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium text-blue-900">Approval Benefits</span>
              </div>
              <ul className="space-y-1 text-blue-800 list-disc list-inside ml-6">
                <li>Admin approval waives salary deduction</li>
                <li>Valid reasons considered for approval</li>
                <li>Request within 30 days of late arrival</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request Form */}
      <LateRequestForm onSuccess={handleSuccess} />

      {/* Status Legend */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Request Status Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Pending</Badge>
              <span>Awaiting admin review</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-600">Approved</Badge>
              <span>No salary deduction</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive">Rejected</Badge>
              <span>Salary deduction applies</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
