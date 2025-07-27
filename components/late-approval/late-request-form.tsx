"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CalendarIcon, Clock, Send } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface LateRequestFormProps {
  onSuccess?: () => void
}

export function LateRequestForm({ onSuccess }: LateRequestFormProps) {
  const [formData, setFormData] = useState({
    date: "",
    lateMinutes: "",
    reason: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.date || !formData.lateMinutes || !formData.reason.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch("/api/late-approval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: formData.date,
          lateMinutes: Number.parseInt(formData.lateMinutes),
          reason: formData.reason,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Late approval request submitted successfully",
        })
        setFormData({ date: "", lateMinutes: "", reason: "" })
        onSuccess?.()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to submit request",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while submitting the request",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const today = new Date().toISOString().split("T")[0]
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() - 30) // Can request approval for up to 30 days back
  const minDate = maxDate.toISOString().split("T")[0]

  return (
    <Card className="border-orange-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
        <CardTitle className="flex items-center gap-2 text-orange-900">
          <Clock className="h-5 w-5" />
          Request Late Arrival Approval
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date of Late Arrival</Label>
              <div className="relative">
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                  min={minDate}
                  max={today}
                  required
                  className="pl-10"
                />
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-orange-600" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lateMinutes">Minutes Late</Label>
              <div className="relative">
                <Input
                  id="lateMinutes"
                  type="number"
                  min="1"
                  max="480"
                  value={formData.lateMinutes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, lateMinutes: e.target.value }))}
                  placeholder="e.g., 30"
                  required
                  className="pl-10"
                />
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Late Arrival</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="Please provide a detailed reason for your late arrival..."
              rows={4}
              required
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="text-sm text-amber-800">
              <strong>Important:</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Late approval requests must be submitted within 30 days</li>
                <li>Without approval, late hours will be deducted from your salary</li>
                <li>Provide a valid reason for consideration</li>
                <li>Admin approval is required for salary protection</li>
              </ul>
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
          >
            <Send className="mr-2 h-4 w-4" />
            {submitting ? "Submitting..." : "Submit Request"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
