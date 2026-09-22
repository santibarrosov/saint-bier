import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg-sunken)] transition-colors",
      "data-[state=checked]:bg-[var(--color-primary)] data-[state=checked]:border-[var(--color-primary)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="block h-5 w-5 translate-x-1 rounded-full bg-[var(--color-text)] shadow transition-transform data-[state=checked]:translate-x-6 data-[state=checked]:bg-[var(--color-text-on-primary)]" />
  </SwitchPrimitive.Root>
))
Switch.displayName = SwitchPrimitive.Root.displayName

export { Switch }
