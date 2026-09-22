import { useEffect, useRef, useState } from "react"

/**
 * Mantiene la pantalla prendida mientras el componente está montado (Modo Cocción).
 * El navegador libera el lock automáticamente cuando la pestaña se oculta — lo volvemos
 * a pedir en `visibilitychange` para recuperarlo al volver. Con feature-detection: en
 * navegadores sin soporte simplemente no hace nada (se avisa en la UI como fallback).
 */
export function useWakeLock(active: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null)
  const [supported] = useState(() => typeof navigator !== "undefined" && "wakeLock" in navigator)
  const [held, setHeld] = useState(false)

  useEffect(() => {
    if (!active || !supported) return

    let cancelled = false

    async function acquire() {
      try {
        const lock = await navigator.wakeLock.request("screen")
        if (cancelled) {
          await lock.release()
          return
        }
        lockRef.current = lock
        setHeld(true)
        lock.addEventListener("release", () => setHeld(false))
      } catch {
        setHeld(false)
      }
    }

    void acquire()

    function onVisibilityChange() {
      if (document.visibilityState === "visible" && !lockRef.current) void acquire()
    }
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", onVisibilityChange)
      lockRef.current?.release().catch(() => {})
      lockRef.current = null
    }
  }, [active, supported])

  return { supported, held }
}
