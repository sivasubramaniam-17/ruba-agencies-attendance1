import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { User, Mail, Phone, MapPin, Calendar, Briefcase, Edit, Save, Camera } from "lucide-react"
import { prisma } from "@/lib/prisma"

async function getUserProfile(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      attendanceRecords: {
        where: {
          date: {
            gte: new Date(new Date().getFullYear(), 0, 1),
          },
        },
      },
      leaveRequests: {
        where: {
          status: "APPROVED",
          startDate: {
            gte: new Date(new Date().getFullYear(), 0, 1),
          },
        },
      },
    },
  })

  if (!user) return null

  const presentDays = user.attendanceRecords.filter((r) => r.status === "PRESENT" || r.status === "LATE").length
  const totalWorkingDays = user.attendanceRecords.length
  const attendanceRate = totalWorkingDays > 0 ? (presentDays / totalWorkingDays) * 100 : 0
  const totalHours = user.attendanceRecords.reduce((sum, record) => sum + (record.totalHours || 0), 0)
  const leaveDaysUsed = user.leaveRequests.reduce((sum, leave) => sum + leave.totalDays, 0)
  const monthsEmployed = Math.floor(
    (new Date().getTime() - new Date(user.joinDate).getTime()) / (1000 * 60 * 60 * 24 * 30),
  )

  return {
    ...user,
    stats: {
      attendanceRate: Math.round(attendanceRate * 10) / 10,
      totalHours: Math.round(totalHours * 10) / 10,
      leaveDaysUsed,
      monthsEmployed,
    },
  }
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/auth/signin")
  }

  const userProfile = await getUserProfile(session.user.email!)

  if (!userProfile) {
    redirect("/auth/signin")
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-violet-900">Profile</h1>
            <p className="text-violet-600 text-sm sm:text-base">
              Manage your personal information and account settings
            </p>
          </div>
          <Badge variant="outline" className="border-violet-200 text-violet-700">
            {userProfile.role}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Picture & Basic Info */}
          <Card className="border-violet-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100">
              <CardTitle className="flex items-center gap-2 text-violet-900">
                <User className="h-5 w-5" />
                Profile Picture
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 text-center space-y-4">
              <div className="relative inline-block">
                <Avatar className="w-24 h-24 mx-auto">
                  <AvatarImage
                    src={userProfile.profileImage || ""}
                    alt={`${userProfile.firstName} ${userProfile.lastName}`}
                  />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-violet-600 to-purple-600 text-white">
                    {userProfile.firstName?.charAt(0)}
                    {userProfile.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0 bg-violet-600 hover:bg-violet-700"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-violet-900">
                  {userProfile.firstName} {userProfile.lastName}
                </h3>
                <p className="text-sm text-violet-600">{userProfile.email}</p>
                <p className="text-xs text-gray-500 mt-1">Employee ID: {userProfile.employeeId}</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-center gap-2 text-violet-700">
                  <Briefcase className="h-4 w-4" />
                  <span>{userProfile.position}</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-violet-700">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Joined{" "}
                    {new Date(userProfile.joinDate).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              <Button className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-violet-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100">
                <CardTitle className="flex items-center gap-2 text-violet-900">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-violet-900 font-medium">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      defaultValue={userProfile.firstName || ""}
                      className="border-violet-200 focus:border-violet-500 focus:ring-violet-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-violet-900 font-medium">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      defaultValue={userProfile.lastName || ""}
                      className="border-violet-200 focus:border-violet-500 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-violet-900 font-medium">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-violet-400 h-4 w-4" />
                    <Input
                      id="email"
                      type="email"
                      defaultValue={userProfile.email}
                      className="pl-10 border-violet-200 focus:border-violet-500 focus:ring-violet-500"
                      disabled
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-violet-900 font-medium">
                    Phone Number
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-violet-400 h-4 w-4" />
                    <Input
                      id="phone"
                      type="tel"
                      defaultValue={userProfile.phone || ""}
                      className="pl-10 border-violet-200 focus:border-violet-500 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-violet-900 font-medium">
                    Address
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-violet-400 h-4 w-4" />
                    <Textarea
                      id="address"
                      defaultValue={userProfile.address || ""}
                      className="pl-10 border-violet-200 focus:border-violet-500 focus:ring-violet-500 min-h-[80px]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Work Information */}
            <Card className="border-violet-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100">
                <CardTitle className="flex items-center gap-2 text-violet-900">
                  <Briefcase className="h-5 w-5" />
                  Work Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employeeId" className="text-violet-900 font-medium">
                      Employee ID
                    </Label>
                    <Input
                      id="employeeId"
                      defaultValue={userProfile.employeeId}
                      disabled
                      className="border-violet-200 bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-violet-900 font-medium">
                      Department
                    </Label>
                    <Input
                      id="department"
                      defaultValue={userProfile.department || ""}
                      className="border-violet-200 focus:border-violet-500 focus:ring-violet-500"
                      disabled
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="position" className="text-violet-900 font-medium">
                      Position
                    </Label>
                    <Input
                      id="position"
                      defaultValue={userProfile.position || ""}
                      className="border-violet-200 focus:border-violet-500 focus:ring-violet-500"
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="joiningDate" className="text-violet-900 font-medium">
                      Joining Date
                    </Label>
                    <Input
                      id="joiningDate"
                      type="date"
                      defaultValue={new Date(userProfile.joinDate).toISOString().split("T")[0]}
                      disabled
                      className="border-violet-200 bg-gray-50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContact" className="text-violet-900 font-medium">
                    Emergency Contact
                  </Label>
                  <Input
                    id="emergencyContact"
                    defaultValue={userProfile.emergencyContact || ""}
                    className="border-violet-200 focus:border-violet-500 focus:ring-violet-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 px-8">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>

        {/* Account Statistics */}
        <Card className="border-violet-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100">
            <CardTitle className="flex items-center gap-2 text-violet-900">
              <Calendar className="h-5 w-5" />
              Account Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{userProfile.stats.attendanceRate}%</div>
                <div className="text-sm text-blue-700">Attendance Rate</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
                <div className="text-2xl font-bold text-green-600">{userProfile.stats.totalHours}h</div>
                <div className="text-sm text-green-700">Hours This Year</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200">
                <div className="text-2xl font-bold text-orange-600">{userProfile.stats.leaveDaysUsed}</div>
                <div className="text-sm text-orange-700">Leave Days Used</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
                <div className="text-2xl font-bold text-purple-600">{userProfile.stats.monthsEmployed}</div>
                <div className="text-sm text-purple-700">Months Employed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
