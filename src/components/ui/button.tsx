import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-primary)] text-[var(--color-text-on-primary)] shadow-sm hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)]",
        secondary:
          "bg-[var(--color-bg-elevated)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-bg-overlay)]",
        outline:
          "border border-[var(--color-border-strong)] bg-transparent text-[var(--color-text)] hover:bg-[var(--color-bg-raised)]",
        ghost: "bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-bg-raised)] hover:text-[var(--color-text)]",
        destructive: "bg-[var(--color-danger)] text-white hover:brightness-110",
        link: "text-[var(--color-primary)] underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-12 px-5 text-[15px]",
        sm: "h-9 px-3.5 text-sm rounded-[var(--radius-sm)]",
        lg: "h-14 px-7 text-base rounded-[var(--radius-md)]",
        icon: "h-12 w-12 shrink-0",
        "icon-sm": "h-9 w-9 shrink-0 rounded-[var(--radius-sm)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
