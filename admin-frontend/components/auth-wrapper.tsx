// components/auth-wrapper.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface AuthWrapperProps {
  children: React.ReactNode
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token")
      const user = localStorage.getItem("user")
      
      console.log("🔐 Auth check - Token:", token ? "Present" : "Missing")
      console.log("🔐 Auth check - User:", user ? "Present" : "Missing")
      
      if (!token || !user) {
        console.log("❌ No auth data found, redirecting to login...")
        setIsAuthenticated(false)
        router.replace("/")
        return
      }
      
      console.log("✅ Auth data found, user is authenticated")
      setIsAuthenticated(true)
    }

    // Check auth immediately
    checkAuth()

    // Also listen for storage changes (for logout from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "token" || e.key === "user") {
        checkAuth()
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [router])

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // If not authenticated, show nothing (redirect is happening)
  if (!isAuthenticated) {
    return null
  }

  // If authenticated, show the protected content
  return <>{children}</>
}