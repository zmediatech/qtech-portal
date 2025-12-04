"use client"

import { Search, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "./theme-toggle"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function AdminHeader() {
  const router = useRouter()

  // Public login route after logout
  const LOGIN_PATH = (process.env.NEXT_PUBLIC_LOGIN_PATH || "/login").trim() || "/login"

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
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
      <div className="w-full flex-1">
        <form>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search students, courses, fees..."
              className="w-full appearance-none bg-background pl-8 shadow-none md:w-2/3 lg:w-1/3"
            />
          </div>
        </form>
      </div>

      {/* Dark-mode toggle */}
      <ThemeToggle />

      {/* Logout */}
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 bg-transparent"
        onClick={handleLogout}
        title="Logout"
      >
        <LogOut className="h-4 w-4" />
        <span className="sr-only">Logout</span>
      </Button>
    </header>
  )
}
