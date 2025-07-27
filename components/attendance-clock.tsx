"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin, CheckCircle, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatTime } from "@/lib/utils"

interface AttendanceRecord {
  id: string
  checkInTime: string | null
  checkOutTime: string | null
  status: string
  isLate: boolean
  totalHours: number | null
}

export function AttendanceClock() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState<string | null>(null)
  const [systemSettings, setSystemSettings] = useState({
    workingHoursStart: "09:00",
    workingHoursEnd: "17:00",
    lateThreshold: "09:15",
  })
  const { toast } = useToast()

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    fetchTodayRecord()
    fetchSystemSettings()
    getCurrentLocation()

    return () => clearInterval(timer)
  }, [])

  const fetchSystemSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings")
      if (response.ok) {
        const data = await response.json()
        if (data.settings) {
          setSystemSettings({
            workingHoursStart: data.settings.workingHoursStart || "09:00",
            workingHoursEnd: data.settings.workingHoursEnd || "17:00",
            lateThreshold: data.settings.lateThreshold || "09:15",
          })
        }
      }
    } catch (error) {
      console.error("Error fetching system settings:", error)
    }
  }

  const fetchTodayRecord = async () => {
    try {
      const response = await fetch("/api/attendance")
      if (response.ok) {
        const data = await response.json()
        setTodayRecord(data.record)
      }
    } catch (error) {
      console.error("Error fetching today's record:", error)
    }
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
        },
        (error) => {
          console.error("Error getting location:", error)
          setLocation("Location unavailable")
        },
      )
    } else {
      setLocation("Geolocation not supported")
    }
  }

  const handleAttendance = async (action: "checkin" | "checkout") => {
    setLoading(true)
    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          location,
          method: "MANUAL",
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: data.message,
        })
        fetchTodayRecord()
      } else {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error marking attendance:", error)
      toast({
        title: "Error",
        description: "Failed to mark attendance",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const isLateCheckIn = () => {
    const now = new Date()
    const [hours, minutes] = systemSettings.lateThreshold.split(":").map(Number)
    const lateThreshold = new Date()
    lateThreshold.setHours(hours, minutes, 0, 0)
    return now > lateThreshold
  }

  const getWorkingHoursStatus = () => {
    const now = new Date()
    const [startHours, startMinutes] = systemSettings.workingHoursStart.split(":").map(Number)
    const [endHours, endMinutes] = systemSettings.workingHoursEnd.split(":").map(Number)

    const workStart = new Date()
    workStart.setHours(startHours, startMinutes, 0, 0)

    const workEnd = new Date()
    workEnd.setHours(endHours, endMinutes, 0, 0)

    if (now < workStart) {
      return { status: "before", message: "Before working hours" }
    } else if (now > workEnd) {
      return { status: "after", message: "After working hours" }
    } else {
      return { status: "during", message: "Working hours" }
    }
  }

  const workingStatus = getWorkingHoursStatus()

  return (
    <div className="space-y-6">
      {/* Current Time Display */}
      <div className="text-center space-y-4">
        <div className="text-6xl sm:text-7xl font-bold text-violet-900 font-mono tracking-tight">
          {formatTime(currentTime)}
        </div>
        <div className="text-lg text-violet-600">
          {currentTime.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
        <Badge
          variant={workingStatus.status === "during" ? "default" : "secondary"}
          className={`text-sm px-4 py-2 ${
            workingStatus.status === "during"
              ? "bg-green-100 text-green-800 border-green-200"
              : "bg-gray-100 text-gray-800 border-gray-200"
          }`}
        >
          <Clock className="mr-2 h-4 w-4" />
          {workingStatus.message}
        </Badge>
      </div>

      {/* Working Hours Info */}
      <Card className="border-violet-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-violet-600">Work Start</div>
              <div className="text-lg font-semibold text-violet-900">{systemSettings.workingHoursStart}</div>
            </div>
            <div>
              <div className="text-sm text-violet-600">Work End</div>
              <div className="text-lg font-semibold text-violet-900">{systemSettings.workingHoursEnd}</div>
            </div>
            <div>
              <div className="text-sm text-violet-600">Late After</div>
              <div className="text-lg font-semibold text-violet-900">{systemSettings.lateThreshold}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Status */}
      {todayRecord && (
        <Card className="border-violet-200">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-violet-600">Check In:</span>
                <div className="flex items-center gap-2">
                  {todayRecord.checkInTime ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{formatTime(new Date(todayRecord.checkInTime))}</span>
                      {todayRecord.isLate && (
                        <Badge variant="destructive" className="text-xs">
                          Late
                        </Badge>
                      )}
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-500">Not checked in</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-violet-600">Check Out:</span>
                <div className="flex items-center gap-2">
                  {todayRecord.checkOutTime ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{formatTime(new Date(todayRecord.checkOutTime))}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-500">Not checked out</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {todayRecord.totalHours && (
              <div className="mt-4 pt-4 border-t border-violet-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-violet-600">Total Hours:</span>
                  <span className="text-lg font-semibold text-violet-900">{todayRecord.totalHours.toFixed(1)}h</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Location Info */}
      {location && (
        <Card className="border-violet-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-violet-600">
              <MapPin className="h-4 w-4" />
              <span>Location: {location}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Button
          onClick={() => handleAttendance("checkin")}
          disabled={loading || !!todayRecord?.checkInTime}
          className="h-16 text-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-50"
        >
          <CheckCircle className="mr-2 h-6 w-6" />
          {loading ? "Processing..." : "Check In"}
          {!todayRecord?.checkInTime && isLateCheckIn() && (
            <Badge variant="destructive" className="ml-2 text-xs">
              Will be Late
            </Badge>
          )}
        </Button>

        <Button
          onClick={() => handleAttendance("checkout")}
          disabled={loading || !todayRecord?.checkInTime || !!todayRecord?.checkOutTime}
          variant="outline"
          className="h-16 text-lg border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          <XCircle className="mr-2 h-6 w-6" />
          {loading ? "Processing..." : "Check Out"}
        </Button>
      </div>

      {/* Status Messages */}
      {!todayRecord?.checkInTime && (
        <div className="text-center text-sm text-violet-600">Click "Check In" to start your workday</div>
      )}

      {todayRecord?.checkInTime && !todayRecord?.checkOutTime && (
        <div className="text-center text-sm text-green-600">
          You're checked in! Don't forget to check out when you leave.
        </div>
      )}

      {todayRecord?.checkInTime && todayRecord?.checkOutTime && (
        <div className="text-center text-sm text-blue-600">
          Your workday is complete. Total hours: {todayRecord.totalHours?.toFixed(1)}h
        </div>
      )}
    </div>
  )
}
