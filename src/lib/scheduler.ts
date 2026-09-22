import { addDays, areIntervalsOverlapping, format, parseISO } from "date-fns"
import type { Batch } from "@/data/types"

export interface PlannedDays {
  fermentationDays: number
  conditioningDays: number
  carbonationDays: number
}

export interface BackwardSchedule {
  requiredBrewDate: string
  requiredPackageDate: string
  requiredReadyDate: string
  eventDate: string
}

/**
 * Planificación hacia atrás: desde la fecha del evento, resta el día de armado,
 * la carbonatación, la maduración y la fermentación para saber cuándo hay que cocinar.
 */
export function calcBackwardSchedule(eventDate: string, days: PlannedDays, setupBufferDays = 1): BackwardSchedule {
  const event = parseISO(eventDate)
  const readyDate = addDays(event, -setupBufferDays)
  const packageDate = addDays(readyDate, -days.carbonationDays)
  const brewDate = addDays(packageDate, -(days.conditioningDays + days.fermentationDays))

  return {
    requiredBrewDate: format(brewDate, "yyyy-MM-dd"),
    requiredPackageDate: format(packageDate, "yyyy-MM-dd"),
    requiredReadyDate: format(readyDate, "yyyy-MM-dd"),
    eventDate,
  }
}

export interface FermenterWindow {
  batchId: string
  batchCode: string
  start: Date
  end: Date
}

/** Ventana de ocupación del fermentador de una cocción activa (sin envasar todavía = "abierta"). */
export function fermenterWindowFor(batch: Pick<Batch, "id" | "code" | "brewDate" | "packageDate" | "status">): FermenterWindow {
  const start = parseISO(batch.brewDate)
  const end = batch.packageDate ? parseISO(batch.packageDate) : addDays(new Date(), 3650)
  return { batchId: batch.id, batchCode: batch.code, start, end }
}

export interface ConflictCheckResult {
  hasConflict: boolean
  overlapping: FermenterWindow[]
}

/**
 * Chequea si una ventana [start, end] de fermentador se solapa con más cocciones activas
 * de las que hay fermentadores disponibles.
 */
export function checkFermenterConflict(
  window: { start: Date; end: Date },
  activeBatches: Pick<Batch, "id" | "code" | "brewDate" | "packageDate" | "status">[],
  fermenterCount: number,
  excludeBatchId?: string,
): ConflictCheckResult {
  const overlapping = activeBatches
    .filter((b) => b.id !== excludeBatchId)
    .map(fermenterWindowFor)
    .filter((w) => areIntervalsOverlapping({ start: window.start, end: window.end }, { start: w.start, end: w.end }, { inclusive: true }))

  return { hasConflict: overlapping.length + 1 > fermenterCount, overlapping }
}
