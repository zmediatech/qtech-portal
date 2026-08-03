import type { Metadata } from "next"
import "./globals.css"
import { AuthGate } from "@/components/auth-gate"
import { ThemeProvider } from "@/components/theme-provider"

export const metadata: Metadata = {
  title: "Your App",
  description: "…",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthGate>{children}</AuthGate>
        </ThemeProvider>
      </body>
    </html>
  )
}
