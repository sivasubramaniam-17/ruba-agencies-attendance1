"use client"

import type React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"
import { Bell, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import PWAInstallButton from "../pwainstallbutton"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()

  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean)
    const breadcrumbs = []

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      const href = "/" + segments.slice(0, i + 1).join("/")
      const title = segment.charAt(0).toUpperCase() + segment.slice(1).replace("-", " ")

      breadcrumbs.push({
        title,
        href,
        isLast: i === segments.length - 1,
      })
    }

    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="sticky top-0 z-40 flex h-14 sm:h-16 shrink-0 items-center gap-2 border-b border-violet-100 bg-white/70 backdrop-blur-xl px-3 sm:px-4 shadow-sm shadow-violet-500/5">
          <SidebarTrigger className="-ml-1 text-violet-600 hover:bg-violet-50 p-2 rounded-lg">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
          <Separator orientation="vertical" className="mr-2 h-4 bg-violet-200" />

          {/* Breadcrumbs - Hidden on small screens */}
          <Breadcrumb className="hidden sm:block">
            <BreadcrumbList>
              {breadcrumbs.map((breadcrumb, index) => (
                <div key={breadcrumb.href} className="flex items-center">
                  {index > 0 && <BreadcrumbSeparator className="text-violet-400" />}
                  <BreadcrumbItem>
                    {breadcrumb.isLast ? (
                      <BreadcrumbPage className="text-violet-900 font-medium">{breadcrumb.title}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={breadcrumb.href} className="text-violet-600 hover:text-violet-800">
                        {breadcrumb.title}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>

          {/* Mobile title */}
          <div className="sm:hidden flex-1">
            <h1 className="text-lg font-semibold text-violet-900">
              {breadcrumbs[breadcrumbs.length - 1]?.title || "Dashboard"}
            </h1>
          </div>

          {/* Notifications */}
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-full text-violet-600 hover:bg-violet-50"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
            </Button>
          </div>

        </header>

        {/* Main content */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-violet-50/40 via-white to-fuchsia-50/30 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
