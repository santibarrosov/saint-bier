import { useLiveQuery } from "dexie-react-hooks"
import { db } from "./db"
import type { AppSettings } from "./types"

export function useRecipes() {
  return useLiveQuery(() => db.recipes.orderBy("updatedAt").reverse().toArray(), [], [])
}

export function useRecipe(id: string | undefined) {
  return useLiveQuery(() => (id ? db.recipes.get(id) : undefined), [id])
}

export function useActiveRecipes() {
  return useLiveQuery(
    () => db.recipes.filter((r) => !r.archived).toArray(),
    [],
    [],
  )
}

export function useBatches() {
  return useLiveQuery(() => db.batches.orderBy("brewDate").reverse().toArray(), [], [])
}

export function useBatch(id: string | undefined) {
  return useLiveQuery(() => (id ? db.batches.get(id) : undefined), [id])
}

export function useFermenterActiveBatches() {
  return useLiveQuery(
    () => db.batches.filter((b) => b.status !== "envasada" && b.status !== "finalizada").toArray(),
    [],
    [],
  )
}

export function useYeastStrains() {
  return useLiveQuery(() => db.yeastStrains.orderBy("name").toArray(), [], [])
}

export function useYeastHarvests() {
  return useLiveQuery(() => db.yeastHarvests.orderBy("harvestDate").reverse().toArray(), [], [])
}

export function useInventoryItems() {
  return useLiveQuery(() => db.inventoryItems.orderBy("name").toArray(), [], [])
}

export function useInventoryItem(id: string | undefined) {
  return useLiveQuery(() => (id ? db.inventoryItems.get(id) : undefined), [id])
}

export function useInventoryTransactions(itemId?: string) {
  return useLiveQuery(async () => {
    const all = await db.inventoryTransactions.orderBy("createdAt").reverse().toArray()
    return itemId ? all.filter((t) => t.itemId === itemId) : all
  }, [itemId], [])
}

export function useKegs() {
  return useLiveQuery(() => db.kegs.orderBy("physicalLabel").toArray(), [], [])
}

export function useKeg(id: string | undefined) {
  return useLiveQuery(() => (id ? db.kegs.get(id) : undefined), [id])
}

export function useEvents() {
  return useLiveQuery(() => db.events.orderBy("date").toArray(), [], [])
}

export function useEvent(id: string | undefined) {
  return useLiveQuery(() => (id ? db.events.get(id) : undefined), [id])
}

const SETTINGS_FALLBACK: AppSettings = {
  id: "settings",
  hourlyRate: 0,
  defaultGasCost: 0,
  defaultSanitizerCost: 0,
  defaultEfficiencyPct: 70,
  defaultBatchVolumeL: 100,
  litersPerAdult: 0.75,
  kegAmortizationPerLiter: 0,
  targetMarginPct: 40,
  fermenterCount: 1,
}

export function useSettings(): AppSettings {
  const settings = useLiveQuery(() => db.settings.get("settings"), [], undefined)
  return settings ?? SETTINGS_FALLBACK
}
