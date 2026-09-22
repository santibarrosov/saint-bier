import type { BoilAlarm } from "@/data/types"

/**
 * Todo acá es matemática pura sobre timestamps absolutos — nunca un contador que viva
 * solo en memoria. Si se cierra la app, se bloquea el celular o se reinicia el navegador,
 * al volver a leer `startedAt` desde Dexie este cálculo da el resultado correcto sin
 * importar cuánto tiempo real haya pasado.
 */

/** Segundos restantes de un paso con timer, recalculado siempre desde el timestamp real de arranque. */
export function computeRemainingSec(startedAt: string, plannedDurationSec: number): number {
  const elapsedSec = (Date.now() - new Date(startedAt).getTime()) / 1000
  return Math.max(0, Math.round(plannedDurationSec - elapsedSec))
}

export function isStepDue(startedAt: string, plannedDurationSec: number): boolean {
  return computeRemainingSec(startedAt, plannedDurationSec) <= 0
}

const WARNING_LEAD_SEC = 120

export interface BoilTimerState {
  elapsedSec: number
  remainingSec: number
  /** próxima alarma sin disparar (aviso o adición), o undefined si ya sonaron todas */
  nextAlarm?: BoilAlarm
  nextAlarmEtaSec?: number
  /** alarmas que corresponde disparar recién ahora (para el efecto de sonido/vibración) */
  dueToWarn: BoilAlarm[]
  dueToTrigger: BoilAlarm[]
}

/**
 * Dado el arranque real del hervor y la lista de alarmas, calcula qué avisos y qué
 * adiciones ya deberían haber sonado a esta altura del tiempo transcurrido.
 * El caller es responsable de persistir `warned`/`triggered` en cuanto disparan, para
 * que no vuelvan a sonar en el próximo tick ni tras un refresh.
 */
export function computeBoilTimerState(boilStartedAt: string, boilTimeMin: number, alarms: BoilAlarm[]): BoilTimerState {
  const elapsedSec = (Date.now() - new Date(boilStartedAt).getTime()) / 1000
  const remainingSec = Math.max(0, boilTimeMin * 60 - elapsedSec)

  const dueToWarn: BoilAlarm[] = []
  const dueToTrigger: BoilAlarm[] = []

  for (const alarm of alarms) {
    const triggerAtSec = (boilTimeMin - alarm.minutesRemaining) * 60
    if (!alarm.warned && elapsedSec >= triggerAtSec - WARNING_LEAD_SEC) dueToWarn.push(alarm)
    if (!alarm.triggered && elapsedSec >= triggerAtSec) dueToTrigger.push(alarm)
  }

  const pending = alarms
    .filter((a) => !a.triggered)
    .map((a) => ({ alarm: a, etaSec: (boilTimeMin - a.minutesRemaining) * 60 - elapsedSec }))
    .sort((a, b) => a.etaSec - b.etaSec)

  return {
    elapsedSec,
    remainingSec,
    nextAlarm: pending[0]?.alarm,
    nextAlarmEtaSec: pending[0]?.etaSec,
    dueToWarn,
    dueToTrigger,
  }
}

export function formatTimer(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
  return `${m}:${String(sec).padStart(2, "0")}`
}
