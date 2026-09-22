import type { ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  back?: boolean
  className?: string
}

export function PageHeader({ title, description, actions, back, className }: PageHeaderProps) {
  const navigate = useNavigate()
  return (
    <div className={cn("mb-5 flex items-start justify-between gap-3 sm:mb-6", className)}>
      <div className="flex min-w-0 items-start gap-2">
        {back && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-0.5 shrink-0 rounded-full p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text)]"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-semibold text-[var(--color-text)] sm:text-3xl">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
