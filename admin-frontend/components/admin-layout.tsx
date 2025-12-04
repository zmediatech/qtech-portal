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
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div
      className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]"
      style={{
        gridTemplateColumns: `${isCollapsed ? "64px" : "280px"} 1fr`,
      }}
    >
      {/* Pass isCollapsed and setIsCollapsed as props */}
      <AdminSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <div className="flex flex-col">
        <AdminHeader />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">{children}</main>
      </div>
    </div>
  )
}