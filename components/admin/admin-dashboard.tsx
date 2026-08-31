"use client"

import type React from "react"
import Link from "next/link"
import { format } from "date-fns"
import {
  Users,
  UserCheck,
  UserX,
  CalendarClock,
  IndianRupee,
  Clock,
  ArrowUpRight,
  Trophy,
  Activity,
  TrendingUp,
  MapPin,
  AlarmClock,
} from "lucide-react"
import { CountUp } from "./stat-count"

interface AdminDashboardProps {
  name: string
  currentTime: Date
  data: any
}

// Circular progress ring (SVG) used for the attendance-rate hero metric.
function Ring({ value, size = 132, stroke = 12 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#d946ef" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ede9fe" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-violet-900">
          <CountUp value={Math.round(value)} suffix="%" />
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-violet-400">Attendance</span>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  prefix,
  gradient,
  sub,
}: {
  icon: React.ElementType
  label: string
  value: number
  prefix?: string
  gradient: string
  sub?: React.ReactNode
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-violet-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/10">
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-2xl transition-opacity group-hover:opacity-40`}
      />
      <div className="relative">
        <div
          className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="mt-4 text-3xl font-bold tracking-tight text-gray-900">
          <CountUp value={value} prefix={prefix} />
        </div>
        <p className="mt-0.5 text-sm text-gray-500">{label}</p>
        {sub && <div className="mt-2">{sub}</div>}
      </div>
    </div>
  )
}

export function AdminDashboard({ name, currentTime, data }: AdminDashboardProps) {
  const s = data?.stats ?? {}
  const total = s.totalEmployees ?? 0
  const present = s.presentToday ?? 0
  const absent = Math.max(0, s.absentToday ?? 0)
  const late = s.lateToday ?? s.lateArrivals ?? 0
  const pending = s.pendingLeaves ?? 0
  const payroll = s.totalSalaryPaid ?? 0
  const rate = total > 0 ? (present / total) * 100 : (s.avgAttendanceRate ?? 0)
  const topPerformer = s.topPerformer ?? "No data"
  const workStart = data?.systemSettings?.workingHoursStart ?? "10:00"
  const workEnd = data?.systemSettings?.workingHoursEnd ?? "18:00"
  const recent: any[] = data?.recentAttendance ?? []

  const quickActions = [
    { href: "/admin/employees", label: "Manage Employees", icon: Users },
    { href: "/admin/attendance", label: "Attendance Reports", icon: TrendingUp },
    { href: "/admin/live-tracking", label: "Live Tracking", icon: MapPin },
    { href: "/admin/salary", label: "Salary Management", icon: IndianRupee },
  ]

  return (
    <div className="space-y-5">
      {/* Hero greeting */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-xl shadow-violet-500/20 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 right-24 h-40 w-40 rounded-full bg-fuchsia-300/20 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-violet-100">{format(currentTime, "EEEE, MMMM do, yyyy")}</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Welcome back, {name} 👋</h1>
            <p className="mt-2 max-w-md text-sm text-violet-100/90">
              Here's how your team is doing today — {present} of {total} present.
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono text-3xl font-bold tabular-nums sm:text-4xl">
              {format(currentTime, "HH:mm:ss")}
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <Clock className="h-3.5 w-3.5" /> Working hours {workStart}–{workEnd}
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Employees"
          value={total}
          gradient="from-violet-500 to-purple-600"
          sub={
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600">
              <Activity className="h-3 w-3" /> Active workforce
            </span>
          }
        />
        <StatCard
          icon={UserCheck}
          label="Present Today"
          value={present}
          gradient="from-emerald-500 to-teal-600"
          sub={
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
              <TrendingUp className="h-3 w-3" /> {Math.round(rate)}% attendance
            </span>
          }
        />
        <StatCard
          icon={CalendarClock}
          label="Pending Leaves"
          value={pending}
          gradient="from-amber-500 to-orange-600"
          sub={
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
              Needs review
            </span>
          }
        />
        <StatCard
          icon={IndianRupee}
          label="Monthly Payroll"
          value={payroll}
          prefix="₹"
          gradient="from-blue-500 to-indigo-600"
          sub={
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
              This month
            </span>
          }
        />
      </div>

      {/* Bento: attendance overview + quick actions + recent activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Attendance overview (wide) */}
        <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-violet-900">Today's Attendance</h2>
            <Link
              href="/admin/attendance"
              className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-800"
            >
              View reports <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
            <Ring value={rate} />
            <div className="grid flex-1 grid-cols-2 gap-3">
              <Breakdown icon={UserCheck} tone="emerald" label="Present" value={present} />
              <Breakdown icon={UserX} tone="rose" label="Absent" value={absent} />
              <Breakdown icon={AlarmClock} tone="amber" label="Late" value={late} />
              <Breakdown icon={CalendarClock} tone="violet" label="On Leave" value={pending} />
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-gradient-to-r from-violet-50 to-fuchsia-50 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow">
              <Trophy className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Top performer this month</p>
              <p className="text-sm font-semibold text-violet-900">{topPerformer}</p>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-violet-900">Quick Actions</h2>
          <div className="space-y-2.5">
            {quickActions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="group flex items-center gap-3 rounded-xl border border-violet-100 bg-violet-50/40 px-3 py-2.5 transition-all hover:border-violet-200 hover:bg-violet-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm">
                  <a.icon className="h-4 w-4" />
                </span>
                <span className="flex-1 text-sm font-medium text-violet-900">{a.label}</span>
                <ArrowUpRight className="h-4 w-4 text-violet-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-violet-900">Recent Activity</h2>
          <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-600">
            {recent.length} today
          </span>
        </div>
        {recent.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {recent.slice(0, 6).map((r) => {
              const initials = `${r.user?.firstName?.[0] ?? ""}${r.user?.lastName?.[0] ?? ""}`.toUpperCase()
              const isPresent = r.status === "PRESENT"
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3 transition-colors hover:bg-violet-50/60"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-bold text-white">
                    {initials || "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {r.user?.firstName || "Unknown"} {r.user?.lastName || ""}
                    </p>
                    <p className="text-xs text-gray-500">
                      {r.checkInTime ? format(new Date(r.checkInTime), "HH:mm") : "--:--"} →{" "}
                      {r.checkOutTime ? format(new Date(r.checkOutTime), "HH:mm") : "--:--"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      isPresent ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-gray-400">No recent activity yet today.</div>
        )}
      </div>
    </div>
  )
}

const toneMap: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-600",
  rose: "bg-rose-50 text-rose-600",
  amber: "bg-amber-50 text-amber-600",
  violet: "bg-violet-50 text-violet-600",
}

function Breakdown({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: React.ElementType
  tone: string
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneMap[tone]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <div className="text-lg font-bold text-gray-900">
          <CountUp value={value} />
        </div>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}
