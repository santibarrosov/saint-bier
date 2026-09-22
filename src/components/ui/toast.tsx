import * as React from "react"
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react"

type ToastVariant = "default" | "success" | "warning" | "danger"

interface ToastItem {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (opts: { title: string; description?: string; variant?: ToastVariant }) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

const ICONS: Record<ToastVariant, React.ReactNode> = {
  default: <Info className="h-5 w-5 text-[var(--color-info)]" />,
  success: <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" />,
  warning: <AlertTriangle className="h-5 w-5 text-[var(--color-warning)]" />,
  danger: <AlertTriangle className="h-5 w-5 text-[var(--color-danger)]" />,
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([])

  const toast = React.useCallback((opts: { title: string; description?: string; variant?: ToastVariant }) => {
    const id = crypto.randomUUID()
    setItems((prev) => [...prev, { id, variant: "default", ...opts }])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, 3800)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:pr-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="ui-pop pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-overlay)] p-3.5 shadow-xl"
            style={{ animationName: "ui-pop-in" }}
            data-state="open"
          >
            {ICONS[item.variant]}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--color-text)]">{item.title}</p>
              {item.description && <p className="text-xs text-[var(--color-text-muted)]">{item.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => setItems((prev) => prev.filter((t) => t.id !== item.id))}
              className="shrink-0 text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>")
  return ctx
}
