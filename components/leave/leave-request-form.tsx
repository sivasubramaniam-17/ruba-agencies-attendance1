"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { CalendarIcon, Loader2, ArrowLeft, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export function LeaveRequestForm({ userId }: { userId: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: "",
    isInformed: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (!formData.startDate || !formData.endDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    if (!formData.leaveType) {
      toast({
        title: "Error",
        description: "Please select a leave type",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    if (!formData.reason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for your leave request",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    const startDate = new Date(formData.startDate)
    const endDate = new Date(formData.endDate)

    if (endDate < startDate) {
      toast({
        title: "Error",
        description: "End date cannot be before start date",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leaveType: formData.leaveType,
          startDate: formData.startDate,
          endDate: formData.endDate,
          reason: formData.reason,
          isInformed: formData.isInformed,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Leave request submitted successfully",
        })
        router.refresh()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to submit leave request",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while submitting your request",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0
    const start = new Date(formData.startDate)
    const end = new Date(formData.endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  }

  const checkWeekendAdjacent = () => {
    if (!formData.startDate || !formData.endDate) return false
    const start = new Date(formData.startDate)
    const end = new Date(formData.endDate)
    const startDay = start.getDay()
    const endDay = end.getDay()
    return startDay === 1 || startDay === 5 || startDay === 6 || endDay === 5 || endDay === 6
  }

  const today = new Date().toISOString().split("T")[0]
  const isWeekendAdjacent = checkWeekendAdjacent()

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="border-violet-200 shadow-xl bg-gradient-to-br from-white to-violet-50">
        <CardHeader className="bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-t-lg">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg sm:text-xl font-bold">New Leave Request</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Leave Type and Days */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="leaveType" className="text-violet-900 font-semibold">
                  Leave Type *
                </Label>
                <Select
                  value={formData.leaveType}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, leaveType: value }))}
                >
                  <SelectTrigger className="h-12 border-violet-200 focus:border-violet-500 focus:ring-violet-500">
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SICK">🤒 Sick Leave</SelectItem>
                    <SelectItem value="CASUAL">😊 Casual Leave</SelectItem>
                    <SelectItem value="ANNUAL">🏖️ Annual Leave</SelectItem>
                    <SelectItem value="MATERNITY">👶 Maternity Leave</SelectItem>
                    <SelectItem value="PATERNITY">👨‍👶 Paternity Leave</SelectItem>
                    <SelectItem value="EMERGENCY">🚨 Emergency Leave</SelectItem>
                    <SelectItem value="UNPAID">💸 Unpaid Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-violet-900 font-semibold">Total Days</Label>
                <div className="h-12 p-3 bg-gradient-to-r from-violet-100 to-purple-100 rounded-lg border border-violet-200 flex items-center justify-center">
                  <span className="text-2xl font-bold text-violet-700">{calculateDays()} days</span>
                </div>
              </div>
            </div>

            {/* Date Selection */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-violet-900 font-semibold">Start Date *</Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                    min={today}
                    className="h-12 border-violet-200 focus:border-violet-500 focus:ring-violet-500 pl-10"
                    required
                  />
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-violet-600" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-violet-900 font-semibold">End Date *</Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                    min={formData.startDate || today}
                    className="h-12 border-violet-200 focus:border-violet-500 focus:ring-violet-500 pl-10"
                    required
                  />
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-violet-600" />
                </div>
              </div>
            </div>

            {/* Weekend Adjacent Warning */}
            {isWeekendAdjacent && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div className="text-sm text-orange-800">
                      <div className="font-medium mb-1">Weekend-Adjacent Leave Detected</div>
                      <div>
                        This leave is adjacent to weekend (Friday/Saturday/Monday). Additional weekend days will be
                        deducted from your salary according to company policy.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Informed Leave Toggle */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="space-y-1">
                  <Label htmlFor="isInformed" className="text-blue-900 font-semibold">
                    Informed Leave
                  </Label>
                  <p className="text-sm text-blue-700">
                    Is this leave being requested in advance? Uninformed leaves have additional salary deductions.
                  </p>
                </div>
                <Switch
                  id="isInformed"
                  checked={formData.isInformed}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isInformed: checked }))}
                />
              </div>

              {!formData.isInformed && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div className="text-sm text-red-800">
                        <div className="font-medium mb-1">Uninformed Leave</div>
                        <div>
                          Uninformed leaves will result in full salary deduction for the leave days. Please provide a
                          valid reason for emergency situations.
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-violet-900 font-semibold">
                Reason *
              </Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Please provide a detailed reason for your leave request..."
                rows={4}
                required
                className="border-violet-200 focus:border-violet-500 focus:ring-violet-500 resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 h-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}