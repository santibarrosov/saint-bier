import type { Event, Keg } from "@/data/types"
import { EVENT_PAYMENT_STATUS_LABELS } from "@/lib/constants"
import { formatCurrency, formatDate, formatLiters } from "@/lib/format"

/** Litros totales estimados a partir de la cantidad de invitados. */
export function calcEstimatedConsumption(guestCount: number, litersPerAdult: number): number {
  return Math.max(0, guestCount) * Math.max(0, litersPerAdult)
}

export interface KegSuggestion {
  kegIds: string[]
  totalLitersSelected: number
  shortfallL: number
}

/**
 * Sugiere qué barriles "listos" llevar para cubrir los litros necesarios.
 * Estrategia golosa por mayor volumen disponible primero, para minimizar la cantidad de barriles.
 */
export function suggestKegsForLiters(
  litersNeeded: number,
  availableKegs: Pick<Keg, "id" | "capacityL" | "estimatedRemainingL" | "status">[],
): KegSuggestion {
  const candidates = availableKegs
    .filter((k) => k.status === "listo")
    .map((k) => ({ id: k.id, liters: k.estimatedRemainingL ?? k.capacityL }))
    .sort((a, b) => b.liters - a.liters)

  const selected: string[] = []
  let accumulated = 0
  for (const keg of candidates) {
    if (accumulated >= litersNeeded) break
    selected.push(keg.id)
    accumulated += keg.liters
  }

  return {
    kegIds: selected,
    totalLitersSelected: accumulated,
    shortfallL: Math.max(0, litersNeeded - accumulated),
  }
}

/** Arma el presupuesto en texto plano, listo para pegar en WhatsApp. */
export function buildBudgetMessage(event: Event, estimatedLiters: number): string {
  const balance = event.budget - event.deposit
  const lines = [
    `🍺 *Presupuesto Saint Bier*`,
    ``,
    `Evento: ${event.name}`,
    `Fecha: ${formatDate(event.date)}`,
    `Salón: ${event.venue}`,
    `Invitados: ${event.guestCount}`,
    `Cerveza estimada: ${formatLiters(estimatedLiters, 0)}`,
    ``,
    `💰 Presupuesto: ${formatCurrency(event.budget)}`,
    `Seña: ${formatCurrency(event.deposit)}`,
    `Saldo: ${formatCurrency(balance)}`,
    `Estado: ${EVENT_PAYMENT_STATUS_LABELS[event.paymentStatus]}`,
    ``,
    `¡Gracias por elegir Saint Bier! 🍻`,
  ]
  return lines.join("\n")
}
