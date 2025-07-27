import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LeaveRequestForm } from "@/components/leave/leave-request-form";
import { LeaveRequestList } from "@/components/leave/leave-request-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Plus, FileText, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";

async function getLeaveStats(userId: string) {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31);

  const [leaveRequests, user] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: {
        userId,
        startDate: {
          gte: startOfYear,
          lte: endOfYear,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        annualLeaveBalance: true,
        sickLeaveBalance: true,
        casualLeaveBalance: true,
      },
    }),
  ]);

  const approvedLeaves = leaveRequests.filter((r) => r.status === "APPROVED");
  const usedDays = approvedLeaves.reduce(
    (sum, leave) => sum + leave.totalDays,
    0
  );
  const pendingRequests = leaveRequests.filter(
    (r) => r.status === "PENDING"
  ).length;

  const nextLeave = leaveRequests
    .filter(
      (r) => r.status === "APPROVED" && new Date(r.startDate) > new Date()
    )
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    )[0];

  return {
    annualLeave: user?.annualLeaveBalance || 30,
    sickLeave: user?.sickLeaveBalance || 15,
    casualLeave: user?.casualLeaveBalance || 10,
    usedDays,
    pendingRequests,
    nextLeave,
    totalRequests: leaveRequests.length,
    approvedThisMonth: approvedLeaves
      .filter(
        (r) =>
          new Date(r.startDate).getMonth() === new Date().getMonth() &&
          new Date(r.startDate).getFullYear() === new Date().getFullYear()
      )
      .reduce((sum, leave) => sum + leave.totalDays, 0),
  };
}

export default async function LeavePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { id: true, firstName: true, lastName: true },
  });

  if (!user) {
    redirect("/auth/signin");
  }

  const stats = await getLeaveStats(user.id);
  const totalLeaveEntitlement =
    stats.annualLeave + stats.sickLeave + stats.casualLeave;
  const leaveUsagePercentage = (stats.usedDays / totalLeaveEntitlement) * 100;

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-violet-900">
              Leave Management
            </h1>
            <p className="text-violet-600 text-sm sm:text-base">
              Request time off and manage your leave applications
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-violet-600">
            <Calendar className="h-4 w-4" />
            <span>{new Date().getFullYear()} Leave Balance</span>
          </div>
        </div>

        {/* Leave Balance Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-violet-200 shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.annualLeave}
              </div>
              <div className="text-xs text-green-700">Annual Leave</div>
              <div className="text-xs text-gray-500 mt-1">Available</div>
            </CardContent>
          </Card>
          <Card className="border-violet-200 shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.sickLeave}
              </div>
              <div className="text-xs text-blue-700">Sick Leave</div>
              <div className="text-xs text-gray-500 mt-1">Available</div>
            </CardContent>
          </Card>
          <Card className="border-violet-200 shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats.casualLeave}
              </div>
              <div className="text-xs text-orange-700">Casual Leave</div>
              <div className="text-xs text-gray-500 mt-1">Available</div>
            </CardContent>
          </Card>
          <Card className="border-violet-200 shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.usedDays}
              </div>
              <div className="text-xs text-purple-700">Used This Year</div>
              <div className="text-xs text-gray-500 mt-1">Total</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leave Request Form */}
          <Card className="border-violet-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100">
              <CardTitle className="flex items-center gap-2 text-violet-900">
                <Plus className="h-5 w-5" />
                Request Leave
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <LeaveRequestForm userId={user.id} />
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="space-y-4">
            <Card className="border-violet-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100">
                <CardTitle className="flex items-center gap-2 text-violet-900">
                  <Clock className="h-5 w-5" />
                  Leave Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-violet-700">
                      Pending Requests
                    </span>
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                      {stats.pendingRequests} Pending
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-violet-700">
                      Approved This Month
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      {stats.approvedThisMonth} Days
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-violet-700">Next Leave</span>
                    <span className="text-sm font-medium text-violet-900">
                      {stats.nextLeave
                        ? new Date(
                            stats.nextLeave.startDate
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "None scheduled"}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-violet-200">
                  <div className="text-sm text-violet-700 mb-2">
                    Leave Usage This Year
                  </div>
                  <div className="w-full bg-violet-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-violet-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(leaveUsagePercentage, 100)}%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-violet-600 mt-1">
                    <span>{stats.usedDays} days used</span>
                    <span>{totalLeaveEntitlement} days total</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-violet-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100">
                <CardTitle className="flex items-center gap-2 text-violet-900">
                  <FileText className="h-5 w-5" />
                  Leave Policies
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-violet-700">Annual Leave:</span>
                    <span className="font-medium">30 days/year</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-violet-700">Sick Leave:</span>
                    <span className="font-medium">15 days/year</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-violet-700">Casual Leave:</span>
                    <span className="font-medium">10 days/year</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-violet-700">Notice Period:</span>
                    <span className="font-medium">7 days</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Leave Request History */}
        <Card className="border-violet-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100">
            <CardTitle className="flex items-center gap-2 text-violet-900">
              <FileText className="h-5 w-5" />
              Leave Request History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <LeaveRequestList userId={user.id} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
