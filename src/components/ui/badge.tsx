import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium leading-none",
  {
    variants: {
      variant: {
        neutral: "bg-[var(--color-bg-overlay)] text-[var(--color-text-muted)] border border-[var(--color-border)]",
        primary: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
        success: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
        warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
        danger: "bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
        info: "bg-[var(--color-info-soft)] text-[var(--color-info)]",
        violet: "bg-[var(--color-violet-soft)] text-[var(--color-violet)]",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dotColor?: string
}

function Badge({ className, variant, dotColor, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props}>
      {dotColor && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />}
      {children}
    </span>
  )
}

export { Badge, badgeVariants }
