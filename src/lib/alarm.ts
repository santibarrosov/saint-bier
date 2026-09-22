/**
 * Sonido y vibración para Modo Cocción. Todo con feature-detection: si algo no está
 * disponible (ej. Vibration API en iOS Safari, que Apple nunca implementó), la función
 * simplemente no hace nada en vez de romper.
 */

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!audioCtx) audioCtx = new Ctor()
  if (audioCtx.state === "suspended") void audioCtx.resume()
  return audioCtx
}

/** Llamar una vez desde un tap del usuario (ej. al entrar a Modo Cocción) para desbloquear audio en mobile. */
export function primeAudio(): void {
  getAudioContext()
}

function beep(ctx: AudioContext, atOffsetSec: number, freq: number, durationSec: number): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = "square"
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.001, ctx.currentTime + atOffsetSec)
  gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + atOffsetSec + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + atOffsetSec + durationSec)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime + atOffsetSec)
  osc.stop(ctx.currentTime + atOffsetSec + durationSec + 0.05)
}

/** Beep fuerte y repetido — para la alarma real de una adición o fin de paso. */
export function playAlarmSound(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  for (let i = 0; i < 4; i++) beep(ctx, i * 0.35, 880, 0.22)
}

/** Beep único y más suave — para el aviso previo de 2 minutos. */
export function playWarningSound(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  beep(ctx, 0, 660, 0.18)
}

export function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern)
  }
}

let notificationPermissionRequested = false

export async function requestNotificationPermission(): Promise<void> {
  if (typeof Notification === "undefined" || notificationPermissionRequested) return
  notificationPermissionRequested = true
  if (Notification.permission === "default") {
    try {
      await Notification.requestPermission()
    } catch {
      // el usuario puede haber denegado o el navegador no soporta el prompt — no es fatal
    }
  }
}

export function showAlarmNotification(title: string, body: string): void {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return
  try {
    new Notification(title, { body, tag: "saint-bier-alarm" })
  } catch {
    // algunos navegadores mobile no soportan `new Notification()` fuera de un Service Worker
  }
}

export function fireAlarm(title: string, body: string, opts?: { warning?: boolean }): void {
  if (opts?.warning) {
    playWarningSound()
    vibrate(200)
  } else {
    playAlarmSound()
    vibrate([300, 150, 300, 150, 300])
  }
  showAlarmNotification(title, body)
}
