import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="font-display text-lg font-semibold text-[var(--color-text)]">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-[var(--color-text-muted)]">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
