import { useState } from "react"
import { Download, Share, X } from "lucide-react"

import { usePwaInstall } from "@/hooks/usePwaInstall"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { Logo } from "@/components/layout/Logo"

const DISMISSED_KEY = "saint-bier-install-banner-dismissed"

/** Banner angosto arriba de la app, solo cuando Android/Chrome confirmó que se puede instalar. */
export function InstallBanner() {
  const { canInstall, installed, promptInstall } = usePwaInstall()
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === "1"
    } catch {
      return false
    }
  })

  if (installed || dismissed || !canInstall) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISSED_KEY, "1")
    } catch {
      // localStorage puede fallar en navegación privada — no es grave, el banner solo vuelve a aparecer
    }
  }

  return (
    <div className="flex items-center gap-3 border-b border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] px-4 py-2.5">
      <Logo showWordmark={false} markSize={26} />
      <p className="flex-1 text-xs text-[var(--color-text)]">
        Instalá Saint Bier como app para usarla sin conexión.
      </p>
      <Button type="button" size="sm" onClick={() => promptInstall()}>
        Instalar
      </Button>
      <button type="button" onClick={dismiss} className="p-1 text-[var(--color-text-faint)]">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

/** Botón fijo para Ajustes — cubre el caso de haber cerrado el banner, y da instrucciones manuales en iOS. */
export function InstallButton() {
  const { canInstall, installed, isIos, promptInstall } = usePwaInstall()
  const { toast } = useToast()
  const [showIosHelp, setShowIosHelp] = useState(false)

  if (installed) {
    return <p className="text-sm text-[var(--color-text-muted)]">Ya la tenés instalada en este dispositivo.</p>
  }

  if (isIos) {
    return (
      <div className="space-y-2">
        <Button type="button" variant="secondary" className="w-full" onClick={() => setShowIosHelp((s) => !s)}>
          <Share className="h-4 w-4" /> Cómo instalar en iPhone
        </Button>
        {showIosHelp && (
          <p className="text-sm text-[var(--color-text-muted)]">
            Tocá el botón <strong>Compartir</strong> de Safari (el cuadrado con la flecha hacia arriba) y elegí{" "}
            <strong>"Agregar a pantalla de inicio"</strong>.
          </p>
        )}
      </div>
    )
  }

  if (!canInstall) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        Tu navegador todavía no ofreció instalar la app. Si acabás de abrirla, probá recargar la página, o buscá
        "Instalar app" / "Agregar a pantalla de inicio" en el menú del navegador.
      </p>
    )
  }

  return (
    <Button
      type="button"
      className="w-full"
      onClick={async () => {
        const accepted = await promptInstall()
        toast({ title: accepted ? "¡Instalada!" : "Instalación cancelada", variant: accepted ? "success" : "default" })
      }}
    >
      <Download className="h-4 w-4" /> Instalar app
    </Button>
  )
}
