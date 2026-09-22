import { useEffect, useState } from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone === true
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

/**
 * Android/Chrome dispara `beforeinstallprompt` cuando el sitio cumple los criterios de
 * instalabilidad (manifest válido + service worker + HTTPS o localhost). Lo guardamos
 * para poder mostrar nuestro propio botón "Instalar" en vez de depender del banner
 * automático del navegador. iOS Safari nunca dispara este evento — ahí no hay forma
 * programática de instalar, solo el paso manual desde Compartir → Agregar a inicio.
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    if (installed) return

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    function onInstalled() {
      setInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [installed])

  async function promptInstall(): Promise<boolean> {
    if (!deferredPrompt) return false
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    return outcome === "accepted"
  }

  return {
    /** true cuando Android/Chrome ya nos dio el evento y podemos disparar el prompt nativo */
    canInstall: Boolean(deferredPrompt),
    /** ya corriendo como app instalada (standalone) — no hace falta mostrar nada */
    installed,
    /** iOS no tiene prompt programático; hay que mostrar instrucciones manuales */
    isIos: isIos(),
    promptInstall,
  }
}
