import Dexie, { type EntityTable } from "dexie"
import type {
  AppSettings,
  Batch,
  Event,
  InventoryItem,
  InventoryTransaction,
  Keg,
  Recipe,
  Review,
  YeastHarvest,
  YeastStrain,
} from "./types"

export class SaintBierDB extends Dexie {
  recipes!: EntityTable<Recipe, "id">
  batches!: EntityTable<Batch, "id">
  yeastStrains!: EntityTable<YeastStrain, "id">
  yeastHarvests!: EntityTable<YeastHarvest, "id">
  inventoryItems!: EntityTable<InventoryItem, "id">
  inventoryTransactions!: EntityTable<InventoryTransaction, "id">
  kegs!: EntityTable<Keg, "id">
  events!: EntityTable<Event, "id">
  settings!: EntityTable<AppSettings, "id">
  reviews!: EntityTable<Review, "id">

  constructor() {
    super("saint-bier")

    this.version(1).stores({
      recipes: "id, name, style, archived, updatedAt",
      batches: "id, code, recipeId, status, brewDate, updatedAt",
      yeastStrains: "id, name, archived",
      yeastHarvests: "id, strainId, harvestDate, discarded",
      inventoryItems: "id, category, name, archived",
      inventoryTransactions: "id, itemId, batchId, type, createdAt",
      kegs: "id, physicalLabel, status, currentBatchId",
      events: "id, date, name",
      settings: "id",
    })

    // v2: Modo Cocción (campos opcionales en recipes/batches, sin migrar índices) + reseñas del portal público
    this.version(2).stores({
      reviews: "id, batchId, style, createdAt",
    })
  }
}

export const db = new SaintBierDB()

export const DEFAULT_BRAND_STORY =
  "Saint Bier nace en Medrano, hecha a mano por un enólogo que cambió el vino por la cerveza sin perderle el respeto al proceso. Cada lote es chico, pensado y cocinado de a uno — nada de líneas de producción."

export const DEFAULT_SETTINGS: AppSettings = {
  id: "settings",
  hourlyRate: 3000,
  defaultGasCost: 4000,
  defaultSanitizerCost: 1500,
  defaultEfficiencyPct: 70,
  defaultBatchVolumeL: 100,
  litersPerAdult: 0.75,
  kegAmortizationPerLiter: 20,
  targetMarginPct: 40,
  fermenterCount: 1,
  publicPortalBaseUrl: "",
  whatsappPhone: "",
  instagramHandle: "",
  brandStory: DEFAULT_BRAND_STORY,
}

/**
 * Escribe los ajustes por defecto si todavía no existen. Se llama una vez al arrancar
 * la app (main.tsx) — nunca desde dentro de un useLiveQuery, porque liveQuery corre el
 * querier en una transacción de solo lectura y un write ahí tira ReadOnlyError.
 */
export async function ensureSettings(): Promise<AppSettings> {
  const existing = await db.settings.get("settings")
  if (existing) return existing
  await db.settings.put(DEFAULT_SETTINGS)
  return DEFAULT_SETTINGS
}
