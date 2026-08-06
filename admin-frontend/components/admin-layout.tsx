// import type React from "react"
// import { AdminSidebar } from "./admin-sidebar"
// import { AdminHeader } from "./admin-header"

// interface AdminLayoutProps {
//   children: React.ReactNode
// }

// export function AdminLayout({ children }: AdminLayoutProps) {
//   return (
//     <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
//       <AdminSidebar/>
//       <div className="flex flex-col">
//         <AdminHeader />
//         <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">{children}</main>
//       </div>
//     </div>
//   )
// }

"use client"

import type React from "react"
import { useState } from "react"
import { AdminSidebar } from "./admin-sidebar"
import { AdminHeader } from "./admin-header"

interface AdminLayoutProps {
  children: React.ReactNode
  initialCollapsed?: boolean
}

export function AdminLayout({ children, initialCollapsed = false }: AdminLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div
      className="flex h-dvh min-h-dvh w-full flex-col overflow-hidden lg:grid"
      style={{ gridTemplateColumns: isCollapsed ? "64px 1fr" : "280px 1fr" }}
    >
      <AdminSidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminHeader onMenuClick={() => setMobileSidebarOpen(true)} />
        <main className="flex min-w-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto p-3 sm:p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
