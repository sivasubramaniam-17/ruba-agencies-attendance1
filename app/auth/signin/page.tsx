"use client"

import type React from "react"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock, Mail, Eye, EyeOff, Clock, MapPin, CheckCircle2 } from "lucide-react"

export default function SignInPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password")
      } else {
        router.push("/dashboard")
      }
    } catch (error) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const features = [
    { icon: Clock, label: "Real-time check-in & attendance" },
    { icon: MapPin, label: "Live GPS location tracking" },
    { icon: CheckCircle2, label: "Leaves, payroll & reports in one place" },
  ]

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      {/* Brand panel (desktop only) */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-violet-600 via-violet-700 to-fuchsia-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-10 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <img src="/logo.png" alt="logo" className="h-12 w-12 rounded-xl bg-white/10 p-1" />
          <span className="text-xl font-bold">Ruba Agencies</span>
        </div>
        <div className="relative space-y-6">
          <h1 className="text-4xl font-bold leading-tight xl:text-5xl">
            Attendance,
            <br />
            reimagined.
          </h1>
          <p className="max-w-sm text-violet-100/90">
            Track attendance, leaves, payroll and live location — all in one beautiful, modern dashboard.
          </p>
          <div className="space-y-3 pt-2">
            {features.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
                  <f.icon className="h-4 w-4" />
                </span>
                <span className="text-sm text-violet-50">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-violet-200/70">© {new Date().getFullYear()} Ruba Agencies. All rights reserved.</p>
      </div>

      {/* Form side */}
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-4 lg:min-h-0">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="mb-6 flex flex-col items-center lg:hidden">
            <img src="/logo.png" alt="logo" className="h-16 w-16" />
            <h1 className="mt-2 text-xl font-bold text-violet-900">Ruba Agencies</h1>
            <p className="text-sm text-violet-500">Attendance Management System</p>
          </div>

          <div className="rounded-3xl border border-violet-100 bg-white/80 p-6 shadow-xl shadow-violet-500/10 backdrop-blur sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-1 text-sm text-gray-500">Sign in to your account to continue.</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-xl pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-xl pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="h-11 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-base font-semibold shadow-lg shadow-violet-500/25 transition-all hover:opacity-95 hover:shadow-violet-500/40"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
