import { useState } from "react"
import { NavLink } from "react-router-dom"
import { Menu, X } from "lucide-react"
import { NAV_ITEMS } from "@/lib/nav"
import { Sheet, SheetContent, SheetClose } from "@/components/ui/sheet"
import { Logo } from "./Logo"
import { cn } from "@/lib/utils"

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const primary = NAV_ITEMS.filter((i) => i.primary)
  const rest = NAV_ITEMS.filter((i) => !i.primary)

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-bg-raised)]/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="grid grid-cols-5">
          {primary.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  isActive ? "text-[var(--color-primary)]" : "text-[var(--color-text-faint)]",
                )
              }
            >
              <item.icon className="h-6 w-6" strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-[var(--color-text-faint)]"
          >
            <Menu className="h-6 w-6" strokeWidth={2} />
            Más
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="p-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
          <div className="mb-4 flex items-center justify-between">
            <Logo markSize={28} wordmarkClassName="text-base" />
            <SheetClose className="rounded-full p-2 text-[var(--color-text-faint)] hover:bg-[var(--color-bg-overlay)]">
              <X className="h-5 w-5" />
            </SheetClose>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {rest.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] py-4 text-xs font-medium",
                    isActive ? "text-[var(--color-primary)] border-[var(--color-primary)]" : "text-[var(--color-text-muted)]",
                  )
                }
              >
                <item.icon className="h-6 w-6" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
