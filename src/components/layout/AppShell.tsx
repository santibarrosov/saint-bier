import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { BottomNav } from "./BottomNav"
import { Logo } from "./Logo"
import { InstallBanner } from "@/components/shared/InstallPrompt"

export function AppShell() {
  return (
    <div className="grain-bg flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Logo markSize={28} wordmarkClassName="text-base" />
          </div>
          <InstallBanner />
        </header>
        <main className="flex-1 px-4 pb-24 pt-5 sm:px-6 sm:pt-6 md:pb-10">
          <div className="mx-auto w-full max-w-5xl">
            <Outlet />
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
