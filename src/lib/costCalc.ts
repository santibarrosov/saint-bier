import type { AppSettings, Batch, InventoryItem } from "@/data/types"

export interface BatchCostBreakdown {
  ingredientsCost: number
  gasCost: number
  sanitizerCost: number
  laborCost: number
  kegAmortizationCost: number
  otherCost: number
  totalCost: number
  costPerLiter: number
}

/** Costo de insumos: solo cuenta ingredientes linkeados a un ítem de inventario (costo conocido). */
export function calcIngredientsCost(batch: Batch, inventoryById: Map<string, InventoryItem>): number {
  let total = 0
  for (const f of batch.fermentables) {
    if (f.inventoryItemId) total += f.amountKg * (inventoryById.get(f.inventoryItemId)?.costPerUnit ?? 0)
  }
  for (const h of batch.hops) {
    if (h.inventoryItemId) total += h.amountG * (inventoryById.get(h.inventoryItemId)?.costPerUnit ?? 0)
  }
  for (const a of batch.adjuncts) {
    if (a.inventoryItemId) total += a.amountKg * (inventoryById.get(a.inventoryItemId)?.costPerUnit ?? 0)
  }
  return total
}

export function calcBatchCost(
  batch: Batch,
  settings: AppSettings,
  inventoryById: Map<string, InventoryItem>,
): BatchCostBreakdown {
  const ingredientsCost = calcIngredientsCost(batch, inventoryById)
  const gasCost = batch.costOverrides?.gasCost ?? settings.defaultGasCost
  const sanitizerCost = batch.costOverrides?.sanitizerCost ?? settings.defaultSanitizerCost
  const laborHours = batch.costOverrides?.laborHours ?? 0
  const laborCost = laborHours * settings.hourlyRate
  const otherCost = batch.costOverrides?.otherCost ?? 0
  const kegAmortizationCost = settings.kegAmortizationPerLiter * batch.batchVolumeL

  const totalCost = ingredientsCost + gasCost + sanitizerCost + laborCost + kegAmortizationCost + otherCost
  const costPerLiter = batch.batchVolumeL > 0 ? totalCost / batch.batchVolumeL : 0

  return { ingredientsCost, gasCost, sanitizerCost, laborCost, kegAmortizationCost, otherCost, totalCost, costPerLiter }
}

/** Precio sugerido por litro para alcanzar el margen objetivo sobre el costo. */
export function calcSuggestedPrice(costPerLiter: number, targetMarginPct: number): number {
  const margin = Math.min(95, Math.max(0, targetMarginPct)) / 100
  if (margin >= 1) return costPerLiter
  return costPerLiter / (1 - margin)
}

/** Margen (%) dado un precio de venta y un costo. */
export function calcMarginPct(revenue: number, cost: number): number {
  if (revenue <= 0) return 0
  return ((revenue - cost) / revenue) * 100
}
