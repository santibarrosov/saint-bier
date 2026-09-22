import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-12 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-bg-sunken)] px-3.5 text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "[&::-webkit-calendar-picker-indicator]:invert-[0.7] [&::-webkit-calendar-picker-indicator]:opacity-70",
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = "Input"

export { Input }
