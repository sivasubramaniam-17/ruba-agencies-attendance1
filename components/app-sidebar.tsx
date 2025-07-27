"use client"

import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Home,
  Clock,
  Calendar,
  User,
  Users,
  Settings,
  LogOut,
  ChevronUp,
  Building2,
  DollarSign,
  Bell,
  FileText,
  ChevronDown,
} from "lucide-react"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

// Employee menu items
const employeeMenuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "My Attendance",
    url: "/attendance",
    icon: Clock,
  },
  {
    title: "Leave Requests",
    url: "/leave",
    icon: Calendar,
  },
  {
    title: "My Profile",
    url: "/profile",
    icon: User,
  },
]

// Admin menu items
const adminMenuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Employee Management",
    url: "/admin/employees",
    icon: Users,
  },
  {
    title: "Attendance",
    icon: Clock,
    items: [
      {
        title: "Attendance Reports",
        url: "/admin/attendance",
      },
      {
        title: "Mark Attendance",
        url: "/admin/mark-attendance",
      },
    ],
  },
  {
    title: "Leave Management",
    url: "/admin/leaves",
    icon: FileText,
  },
  {
    title: "Salary Management",
    url: "/admin/salary",
    icon: DollarSign,
  },
  {
    title: "Notifications",
    url: "/admin/notifications",
    icon: Bell,
  },
  {
    title: "System Settings",
    url: "/admin/settings",
    icon: Settings,
  },
]

export function AppSidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()

  const isActive = (url: string) => {
    if (url === "/dashboard" && pathname === "/dashboard") return true
    if (url !== "/dashboard" && pathname.startsWith(url)) return true
    return false
  }

  const userInitials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U"

  const isAdmin = session?.user?.role === "ADMIN"
  const menuItems = isAdmin ? adminMenuItems : employeeMenuItems

  return (
    <Sidebar variant="inset" className="border-r border-violet-200">
      <SidebarHeader className="border-b border-violet-100 bg-gradient-to-r from-violet-50 to-purple-50">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 text-white font-bold">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-violet-900">Ruba Agencies</h2>
            <p className="text-sm text-violet-600">Attendance System</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-white">
        <SidebarGroup>
          <SidebarGroupLabel className="text-violet-900 font-semibold">
            {isAdmin ? "Admin Panel" : "Employee Portal"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                if (item.items) {
                  return (
                    <Collapsible key={item.title} defaultOpen={item.items.some((subItem) => isActive(subItem.url))}>
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton className="hover:bg-violet-50 hover:text-violet-900">
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                            <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.items.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isActive(subItem.url)}
                                  className="hover:bg-violet-50 hover:text-violet-900 data-[active=true]:bg-violet-100 data-[active=true]:text-violet-900"
                                >
                                  <Link href={subItem.url}>
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  )
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      className="hover:bg-violet-50 hover:text-violet-900 data-[active=true]:bg-violet-100 data-[active=true]:text-violet-900"
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-violet-100 bg-gradient-to-r from-violet-50 to-purple-50">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-violet-100 hover:bg-violet-100 transition-colors"
                >
                  <Avatar className="h-8 w-8 border-2 border-violet-200">
                    <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || ""} />
                    <AvatarFallback className="bg-violet-600 text-white font-semibold">{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold text-violet-900">{session?.user?.name || "User"}</span>
                    <span className="truncate text-xs text-violet-600">{isAdmin ? "Administrator" : "Employee"}</span>
                  </div>
                  <ChevronUp className="ml-auto size-4 text-violet-600" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 border border-violet-200">
                      <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || ""} />
                      <AvatarFallback className="bg-violet-600 text-white font-semibold">{userInitials}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{session?.user?.name || "User"}</span>
                      <span className="truncate text-xs text-muted-foreground">{session?.user?.email || ""}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-red-600 focus:text-red-600"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
