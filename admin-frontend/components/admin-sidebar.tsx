"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { getStoredUser } from "@/lib/session";
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  Users,
  GraduationCap,
  Award,
  ClipboardList,
  UserCheck,
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
} from "lucide-react";

type NavItem = {
  name: string;
  href?: string;
  icon: React.ElementType;
  children?: { name: string; href: string }[];
  roles?: Array<"admin" | "teacher" | "student" | "parent">;
};

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "teacher", "student", "parent"] },
  { name: "My Schedule", href: "/schedule", icon: CalendarDays, roles: ["admin", "teacher", "student", "parent"] },
  { name: "LMS", href: "/courses", icon: BookOpen, roles: ["admin", "teacher", "student", "parent"] },
  {
    name: "Students",
    icon: Users,
    roles: ["admin", "teacher"],
    children: [
      { name: "Admit Student", href: "/students/admit" },
      { name: "All Students", href: "/students" },
      { name: "Graduated", href: "/students/graduated" },
    ],
  },
  {
    name: "Academics",
    icon: GraduationCap,
    roles: ["admin", "teacher"],
    children: [
      { name: "Classes", href: "/classes" },
      { name: "Subjects", href: "/subjects" },
      { name: "Timetables & Slots", href: "/academics/slots" },
    ],
  },
  {
    name: "Attendance",
    icon: UserCheck,
    roles: ["admin", "teacher"],
    children: [
      { name: "Mark Attendance", href: "/attendance" },
      { name: "Attendance Records", href: "/attendance/records" },
    ],
  },
  {
    name: "Exams & Marks",
    icon: ClipboardList,
    roles: ["admin", "teacher"],
    children: [
      { name: "Exams", href: "/exams" },
      { name: "Marks", href: "/marks" },
    ],
  },
  {
    name: "Certificates",
    icon: Award,
    roles: ["admin", "teacher"],
    children: [
      { name: "Create Certificate", href: "/certificates" },
      { name: "All Certificates", href: "/certificates/all" },
    ],
  },
  {
    name: "Administrative",
    icon: Building2,
    roles: ["admin"],
    children: [
      { name: "Fees", href: "/admin/fees" },
      { name: "Expenses", href: "/admin/expenses" },
      { name: "Users & Roles", href: "/users" },
    ],
  },
];

interface SidebarProps {
  className?: string;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export function AdminSidebar({
  className,
  isCollapsed,
  setIsCollapsed,
  mobileOpen,
  setMobileOpen,
}: SidebarProps) {
  const pathname = usePathname();
  const [role, setRole] = useState<"admin" | "teacher" | "student" | "parent" | undefined>();
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const user = getStoredUser();
    setRole(user?.role);
    setUserName(user?.name || "");
  }, []);

  const visibleNavigation = useMemo(
    () => navigation.filter((item) => !item.roles || !role || item.roles.includes(role)),
    [role]
  );

  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    const groups: string[] = [];
    for (const item of navigation) {
      if (item.children?.some((child) => pathname === child.href)) {
        groups.push(item.name);
      }
    }
    return groups;
  });

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) =>
      prev.includes(groupName) ? prev.filter((name) => name !== groupName) : [...prev, groupName],
    );
  };

  const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b px-4 lg:h-[68px] lg:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-semibold">Q Tech</div>
              <div className="text-xs text-muted-foreground">Portal</div>
            </div>
          )}
        </Link>
        {!collapsed && role && <Badge variant="secondary" className="rounded-full capitalize">{role}</Badge>}
      </div>

      {!collapsed && userName && (
        <div className="border-b px-4 py-3 text-sm">
          <div className="font-medium text-foreground">{userName}</div>
          <div className="text-muted-foreground">{role || "member"}</div>
        </div>
      )}

      <ScrollArea className="flex-1 px-3 py-2">
        <nav className="grid gap-1">
          {visibleNavigation.map((item) => {
            if (item.children) {
              const isOpen = openGroups.includes(item.name);
              const hasActiveChild = item.children.some((child) => pathname === child.href);

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
                    <item.icon className="h-4 w-4 shrink-0" />
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
                        <Link key={child.href} href={child.href} onClick={() => setMobileOpen(false)}>
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
              );
            }

            return (
              <Link key={item.href} href={item.href!} onClick={() => setMobileOpen(false)}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-2 px-3 py-2 font-normal",
                    pathname === item.href && "bg-sidebar-primary text-sidebar-primary-foreground",
                    collapsed && "justify-center px-2",
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && item.name}
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );

  return (
    <>
      <div
        className={cn(
          "relative hidden border-r bg-sidebar transition-all duration-300 lg:block",
          isCollapsed ? "w-16" : "w-64",
          className,
        )}
      >
        <SidebarContent collapsed={isCollapsed} />
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute top-4 z-10 h-8 w-8 rounded-full border bg-background shadow-md",
            isCollapsed ? "-right-4" : "right-2",
          )}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex flex-col bg-sidebar p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
