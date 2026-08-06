"use client"

import { Menu, Search, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "./theme-toggle"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { getStoredUser } from "@/lib/session"
import { useEffect, useState } from "react"

interface AdminHeaderProps {
  onMenuClick: () => void
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [role, setRole] = useState("")

  // Public login route after logout
  const LOGIN_PATH = (process.env.NEXT_PUBLIC_LOGIN_PATH || "/login").trim() || "/login"

  useEffect(() => {
    const user = getStoredUser()
    setName(user?.name || "")
    setRole(user?.role || "")
  }, [])

  const handleLogout = async () => {
    try {
      toast.loading("Logging out...")

      // Clear client auth state
      try {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        sessionStorage.clear()
      } catch {}

      // Best-effort cookie clear (if you set any non-httpOnly cookies)
      try {
        document.cookie.split(";").forEach((c) => {
          const eq = c.indexOf("=")
          const name = (eq > -1 ? c.slice(0, eq) : c).trim()
          if (name) document.cookie = `${name}=; Max-Age=0; path=/`
        })
      } catch {}

      toast.dismiss()
      toast.success("Logged out")

      // Navigate to login (replace history + hard fallback)
      try { router.replace(LOGIN_PATH) } catch {}
      setTimeout(() => {
        if (typeof window !== "undefined" && window.location.pathname !== LOGIN_PATH) {
          window.location.replace(LOGIN_PATH)
        }
      }, 30)
    } catch (error) {
      toast.dismiss()
      toast.error("Logout failed. Please try again.")
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-3 backdrop-blur lg:h-[60px] lg:px-6">
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0 bg-transparent lg:hidden"
        onClick={onMenuClick}
        title="Open navigation"
      >
        <Menu className="h-4 w-4" />
        <span className="sr-only">Open navigation</span>
      </Button>

      <div className="hidden w-full flex-1 md:block">
        <form>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search students, courses, fees..."
              className="w-full appearance-none bg-background pl-8 text-sm shadow-none md:w-2/3 lg:w-1/2 xl:w-1/3"
            />
          </div>
        </form>
      </div>

      <div className="hidden items-center gap-2 lg:flex">
        {name && <span className="text-sm font-medium text-slate-700">{name}</span>}
        {role && <Badge variant="secondary" className="capitalize">{role}</Badge>}
      </div>

      {/* Dark-mode toggle */}
      <ThemeToggle />

      {/* Logout */}
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0 bg-transparent"
        onClick={handleLogout}
        title="Logout"
      >
        <LogOut className="h-4 w-4" />
        <span className="sr-only">Logout</span>
      </Button>
    </header>
  )
}
