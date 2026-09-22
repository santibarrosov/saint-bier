import { NavLink } from "react-router-dom"
import { NAV_ITEMS } from "@/lib/nav"
import { Logo } from "./Logo"
import { cn } from "@/lib/utils"

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-raised)] md:flex">
      <div className="p-6">
        <Logo markSize={38} wordmarkClassName="text-lg" />
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-[var(--radius-sm)] px-3.5 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text)]",
              )
            }
          >
            <item.icon className="h-[18px] w-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 text-center text-[11px] text-[var(--color-text-faint)]">
        100% local · sin conexión requerida
      </div>
    </aside>
  )
}
