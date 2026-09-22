import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string
  sublabel?: string
  accent?: "default" | "warning" | "danger" | "success"
  className?: string
}

const ACCENT_CLASSES: Record<NonNullable<StatCardProps["accent"]>, string> = {
  default: "text-[var(--color-primary)] bg-[var(--color-primary-soft)]",
  warning: "text-[var(--color-warning)] bg-[var(--color-warning-soft)]",
  danger: "text-[var(--color-danger)] bg-[var(--color-danger-soft)]",
  success: "text-[var(--color-success)] bg-[var(--color-success-soft)]",
}

export function StatCard({ icon: Icon, label, value, sublabel, accent = "default", className }: StatCardProps) {
  return (
    <Card className={cn("p-4 sm:p-5", className)}>
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)]", ACCENT_CLASSES[accent])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-[var(--color-text-muted)]">{label}</p>
          <p className="font-display text-xl font-semibold leading-tight text-[var(--color-text)]">{value}</p>
        </div>
      </div>
      {sublabel && <p className="mt-2 text-xs text-[var(--color-text-faint)]">{sublabel}</p>}
    </Card>
  )
}
