"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Award,
  ClipboardList,
  BarChart3,
  Settings,
  CreditCard,
  UserCheck,
  Menu,
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
} from "lucide-react"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Students",
    icon: Users,
    children: [
      { name: "Admit Student", href: "/students/admit" },
      { name: "All Students", href: "/students" },
      { name: "Graduated", href: "/students/graduated" },
    ],
  },
  {
    name: "Academics",
    icon: GraduationCap,
    children: [
      { name: "Classes", href: "/classes" },
      { name: "Subjects", href: "/subjects" },
      { name: "Timetables & Slots", href: "/academics/slots" },
    ],
  },
  {
    name: "Attendance",
    icon: UserCheck,
    children: [
      { name: "Mark Attendance", href: "/attendance" },
      { name: "Attendance Records", href: "/attendance/records" },
    ],
  },
  {
    name: "Exams & Marks",
    icon: ClipboardList,
    children: [
      { name: "Exams", href: "/exams" },
      { name: "Marks", href: "/marks" },
    ],
  },
  {
    name: "Certificates",
    href: "/certificates",
    icon: Award,
  },
  {
    name: "Administrative",
    icon: Building2,
    children: [
      { name: "Fees", href: "/admin/fees" },
      { name: "Expenses", href: "/admin/expenses" },
    ],
  },
  // {
  //   name: "Settings",
  //   href: "/settings",
  //   icon: Settings,
  // },
]

interface SidebarProps {
  className?: string
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
}

export function AdminSidebar({ className, isCollapsed, setIsCollapsed }: SidebarProps) {
  const pathname = usePathname()

  // Auto-open any group that contains the current route
  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    const groups: string[] = []
    for (const item of navigation) {
      if (item.children?.some((child) => pathname === child.href)) {
        groups.push(item.name)
      }
    }
    return groups
  })

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) =>
      prev.includes(groupName) ? prev.filter((name) => name !== groupName) : [...prev, groupName],
    )
  }

  const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <GraduationCap className="h-6 w-6 text-primary" />
          {!collapsed && <span className="text-lg">EduAdmin</span>}
        </Link>
      </div>
      <ScrollArea className="flex-1 px-3 py-2">
        <nav className="grid gap-1">
          {navigation.map((item) => {
            if (item.children) {
              const isOpen = openGroups.includes(item.name)
              const hasActiveChild = item.children.some((child) => pathname === child.href)

              return (
                <div key={item.name}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-2 px-3 py-2 text-left font-normal",
                      (isOpen || hasActiveChild) && "bg-sidebar-accent text-sidebar-accent-foreground",
                      collapsed && "justify-center px-2",
                    )}
                    onClick={() => !collapsed && toggleGroup(item.name)}
                    title={collapsed ? item.name : undefined}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && (
                      <>
                        {item.name}
                        {isOpen ? (
                          <ChevronDown className="ml-auto h-4 w-4" />
                        ) : (
                          <ChevronRight className="ml-auto h-4 w-4" />
                        )}
                      </>
                    )}
                  </Button>
                  {isOpen && !collapsed && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <Link key={child.href} href={child.href}>
                          <Button
                            variant="ghost"
                            className={cn(
                              "w-full justify-start px-3 py-1.5 text-sm font-normal",
                              pathname === child.href && "bg-sidebar-primary text-sidebar-primary-foreground",
                            )}
                          >
                            {child.name}
                          </Button>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <Link key={item.href} href={item.href!}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-2 px-3 py-2 font-normal",
                    pathname === item.href && "bg-sidebar-primary text-sidebar-primary-foreground",
                    collapsed && "justify-center px-2",
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && item.name}
                </Button>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={cn(
          "hidden border-r bg-sidebar lg:block transition-all duration-300 relative",
          isCollapsed ? "w-16" : "w-64",
          className,
        )}
      >
        <SidebarContent collapsed={isCollapsed} />
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute top-4 h-8 w-8 rounded-full border bg-background shadow-md z-10",
            isCollapsed ? "-right-4" : "right-2",
          )}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 lg:hidden bg-transparent">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col bg-sidebar p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  )
}