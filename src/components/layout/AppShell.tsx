import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { BottomNav } from "./BottomNav"
import { Logo } from "./Logo"

export function AppShell() {
  return (
    <div className="grain-bg flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 px-4 py-3 backdrop-blur md:hidden">
          <Logo markSize={28} wordmarkClassName="text-base" />
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
