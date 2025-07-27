"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Settings, Clock, DollarSign, Calendar, AlertTriangle, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getUpcomingMonthsWorkingDays, calculateRates, calculateWorkingHours } from "@/lib/date-utils"

interface SystemSettings {
  id: string
  workingHoursStart: string
  workingHoursEnd: string
  lateThreshold: number
  autoDeductLateArrival: boolean
  autoDeductLeave: boolean
  createdAt: string
  updatedAt: string
}

export function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    workingHoursStart: "09:00",
    workingHoursEnd: "17:00",
    lateThreshold: 0, // No grace period
    autoDeductLateArrival: true,
    autoDeductLeave: true,
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/settings")
      if (response.ok) {
        const data = await response.json()
        if (data.settings) {
          setSettings(data.settings)
          setFormData({
            workingHoursStart: data.settings.workingHoursStart,
            workingHoursEnd: data.settings.workingHoursEnd,
            lateThreshold: 0, // Always 0 - no grace period
            autoDeductLateArrival: data.settings.autoDeductLateArrival ?? true,
            autoDeductLeave: data.settings.autoDeductLeave ?? true,
          })
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
      toast({
        title: "Error",
        description: "Failed to load system settings",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)

      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          lateThreshold: 0, // Force to 0
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
        toast({
          title: "Success",
          description: "System settings updated successfully",
        })
        await fetchSettings()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to update settings",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while saving settings",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const dailyWorkingHours = calculateWorkingHours(formData.workingHoursStart, formData.workingHoursEnd)
  const upcomingMonths = getUpcomingMonthsWorkingDays(6)

  // Calculate example rates for a ₹10,000 salary
  const exampleSalary = 10000
  const currentMonth = upcomingMonths[0]
  const exampleRates = calculateRates(exampleSalary, currentMonth.workingDays, dailyWorkingHours)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-violet-600 text-lg">Loading system settings...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-violet-600" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-violet-900">System Settings</h2>
            <p className="text-violet-600">Configure attendance and salary calculation settings</p>
          </div>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={saving}
          className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Form */}
        <Card className="border-violet-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-violet-900">
              <Clock className="h-5 w-5" />
              Working Hours & Policies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workingHoursStart">Start Time</Label>
                  <Input
                    id="workingHoursStart"
                    type="time"
                    value={formData.workingHoursStart}
                    onChange={(e) => setFormData((prev) => ({ ...prev, workingHoursStart: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workingHoursEnd">End Time</Label>
                  <Input
                    id="workingHoursEnd"
                    type="time"
                    value={formData.workingHoursEnd}
                    onChange={(e) => setFormData((prev) => ({ ...prev, workingHoursEnd: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Late Policy Information */}
              <Card className="bg-red-50 border-red-200">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="text-sm text-red-800">
                      <div className="font-medium mb-1">Strict Late Policy</div>
                      <div>
                        No grace period - any late arrival will result in hourly salary deduction unless approved by
                        admin. Employees can request approval for valid reasons.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium text-violet-900">Automatic Deductions</h4>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="autoDeductLateArrival">Late Arrival Deductions</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically deduct salary for unapproved late arrivals
                    </p>
                  </div>
                  <Switch
                    id="autoDeductLateArrival"
                    checked={formData.autoDeductLateArrival}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, autoDeductLateArrival: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="autoDeductLeave">Leave Deductions</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically deduct salary for uninformed and weekend-adjacent leaves
                    </p>
                  </div>
                  <Switch
                    id="autoDeductLeave"
                    checked={formData.autoDeductLeave}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, autoDeductLeave: checked }))}
                  />
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Preview & Information */}
        <div className="space-y-6">
          {/* Working Schedule */}
          <Card className="border-violet-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-violet-900">
                <Calendar className="h-5 w-5" />
                Working Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium text-violet-900">Working Days</div>
                  <div className="text-muted-foreground">Monday - Saturday</div>
                </div>
                <div>
                  <div className="font-medium text-violet-900">Off Day</div>
                  <div className="text-muted-foreground">Sunday</div>
                </div>
                <div>
                  <div className="font-medium text-violet-900">Working Hours</div>
                  <div className="text-muted-foreground">
                    {formData.workingHoursStart} - {formData.workingHoursEnd}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-violet-900">Daily Hours</div>
                  <div className="text-muted-foreground">{dailyWorkingHours.toFixed(1)} hours</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* New Salary Deduction Rules */}
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-900">
                <AlertTriangle className="h-5 w-5" />
                Salary Deduction Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-2">
                <div className="font-medium text-red-900">Late Arrival Policy:</div>
                <ul className="space-y-1 text-red-800 list-disc list-inside ml-2">
                  <li>Hourly deduction for any late arrival</li>
                  <li>No grace period - immediate deduction</li>
                  <li>Admin approval can waive deductions</li>
                  <li>Employees can request approval with valid reasons</li>
                </ul>
              </div>

              <Separator className="bg-red-200" />

              <div className="space-y-2">
                <div className="font-medium text-red-900">Leave Policy:</div>
                <ul className="space-y-1 text-red-800 list-disc list-inside ml-2">
                  <li>One paid leave per month (informed only)</li>
                  <li>Uninformed leaves: Full salary deduction</li>
                  <li>Friday/Saturday leave: Sunday also deducted</li>
                  <li>Monday leave: Sunday also deducted</li>
                  <li>Weekend-adjacent leaves affect weekend pay</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Working Days */}
          <Card className="border-violet-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-violet-900">
                <Calendar className="h-5 w-5" />
                Upcoming Months
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingMonths.map((month, index) => (
                  <div key={`${month.year}-${month.month}`} className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">
                        {month.monthName} {month.year}
                        {index === 0 && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{month.totalDays} total days</div>
                    </div>
                    <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
                      {month.workingDays} working days
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Salary Calculation Example */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-900">
                <DollarSign className="h-5 w-5" />
                Calculation Example
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <div className="font-medium text-green-900 mb-2">
                  For ₹{exampleSalary.toLocaleString()} salary in {currentMonth.monthName}:
                </div>
                <div className="space-y-1 text-green-800">
                  <div>• Working Days: {currentMonth.workingDays}</div>
                  <div>• Total Hours: {(currentMonth.workingDays * dailyWorkingHours).toFixed(1)}</div>
                  <div>• Daily Rate: ₹{exampleRates.dailyRate.toFixed(2)}</div>
                  <div>• Hourly Rate: ₹{exampleRates.hourlyRate.toFixed(2)}</div>
                </div>
              </div>

              <div className="pt-2 border-t border-green-200">
                <div className="text-sm text-green-800">
                  <div className="font-medium mb-1">Deduction Examples:</div>
                  <div>• 1 hour late = ₹{exampleRates.hourlyRate.toFixed(2)} deduction</div>
                  <div>• 1 uninformed leave = ₹{exampleRates.dailyRate.toFixed(2)} deduction</div>
                  <div>• Friday leave = ₹{(exampleRates.dailyRate * 2).toFixed(2)} deduction (Fri + Sun)</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Policies Summary */}
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-900">
                <Settings className="h-5 w-5" />
                Current Policies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Late Grace Period:</span>
                <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                  0 minutes (Strict)
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Auto Late Deduction:</span>
                <Badge variant={formData.autoDeductLateArrival ? "default" : "secondary"}>
                  {formData.autoDeductLateArrival ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Auto Leave Deduction:</span>
                <Badge variant={formData.autoDeductLeave ? "default" : "secondary"}>
                  {formData.autoDeductLeave ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Overtime Pay:</span>
                <Badge variant="secondary">Disabled</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Last Updated Info */}
      {settings && (
        <Card className="border-gray-200">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">
              Last updated: {new Date(settings.updatedAt).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
