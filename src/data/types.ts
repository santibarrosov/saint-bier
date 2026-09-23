// Modelo de datos de Saint Bier — persistencia 100% local (Dexie/IndexedDB).
// Todas las entidades usan `id: string` (uuid) y timestamps `createdAt`/`updatedAt`.

export type Id = string

export interface BaseEntity {
  id: Id
  createdAt: string // ISO
  updatedAt: string // ISO
}

// ---------- Recetas ----------

export type FermentableType = "malta_base" | "malta_especial" | "azucar" | "extracto" | "otro"

export interface RecipeFermentable {
  id: Id
  inventoryItemId?: Id
  name: string
  type: FermentableType
  /** kg para el volumen objetivo de la receta */
  amountKg: number
  /** potencial de extracto en puntos PPG (ej. 36 para pale malt) */
  potentialPpg: number
  /** color en Lovibond */
  colorLovibond: number
}

export type HopUse = "hervor" | "whirlpool" | "dry_hop" | "primera_wort"

export interface RecipeHop {
  id: Id
  inventoryItemId?: Id
  name: string
  /** % de ácidos alfa */
  alphaAcidPct: number
  amountG: number
  use: HopUse
  /** minutos (de hervor, o de reposo en dry hop) */
  timeMin: number
}

export interface RecipeAdjunct {
  id: Id
  inventoryItemId?: Id
  name: string
  amountKg: number
  /** puntos de extracto que aporta por kg, 0 si no fermentable (especias, etc.) */
  potentialPpg: number
  timing: string
}

export interface RecipeTargets {
  og: number
  fg: number
  abv: number
  ibu: number
  srm: number
}

export interface Recipe extends BaseEntity {
  name: string
  style: string
  targetVolumeL: number
  efficiencyPct: number
  targets: RecipeTargets
  fermentables: RecipeFermentable[]
  hops: RecipeHop[]
  adjuncts: RecipeAdjunct[]
  yeastStrainId?: Id
  /** días planificados por defecto, usados por el planificador */
  plannedFermentationDays: number
  plannedConditioningDays: number
  plannedCarbonationDays: number
  /** duración total del hervor en minutos, usada por Modo Cocción para ubicar cada adición de lúpulo */
  boilTimeMin?: number
  /** para el portal público: a qué sabe, en criollo */
  publicTastingNote?: string
  /** para el portal público: override manual de la lista de ingredientes; si falta, se autogenera */
  publicIngredientsNote?: string
  notes?: string
  archived?: boolean
}

// ---------- Cocciones ----------

export type BatchStatus =
  | "planificada"
  | "cociendo"
  | "fermentando"
  | "madurando"
  | "carbonatando"
  | "envasada"
  | "finalizada"

export interface MashStep {
  id: Id
  name: string
  tempC: number
  minutes: number
  phMeasured?: number
}

export interface FermentationLogEntry {
  id: Id
  date: string // ISO date
  tempC: number
  /** densidad específica medida ese día (ej. 1.012) — opcional, no siempre se mide */
  gravity?: number
  note?: string
}

export interface BatchCostOverrides {
  gasCost?: number
  sanitizerCost?: number
  laborHours?: number
  otherCost?: number
}

// ---------- Modo Cocción ----------

export type BrewStepKey =
  | "heat_water"
  | "mash"
  | "recirculate"
  | "mash_out"
  | "sparge"
  | "boil"
  | "whirlpool"
  | "chill"
  | "pitch"

export type BrewStepStatus = "pending" | "active" | "done"

export interface BrewStepCapture {
  id: Id
  label: string
  value: string
  unit?: string
  at: string // ISO timestamp real, no relativo
}

export interface BrewStep {
  id: Id
  key: BrewStepKey
  label: string
  status: BrewStepStatus
  /** ISO absoluto — el resto del tiempo se recalcula siempre desde acá, nunca desde un contador en memoria */
  startedAt?: string
  plannedDurationSec?: number
  completedAt?: string
  note?: string
  captures: BrewStepCapture[]
}

export interface BoilAlarm {
  id: Id
  label: string
  /** minutos restantes de hervor en los que corresponde esta adición */
  minutesRemaining: number
  /** ya sonó el aviso de 2 minutos antes */
  warned: boolean
  /** ya sonó la alarma en el momento exacto */
  triggered: boolean
}

export interface BrewSession {
  active: boolean
  currentStepIndex: number
  steps: BrewStep[]
  /** ISO absoluto de cuándo arrancó el hervor — ancla de todas las alarmas encadenadas */
  boilStartedAt?: string
  boilAlarms: BoilAlarm[]
}

export interface Batch extends BaseEntity {
  code: string // SB-YYYY-NNN
  recipeId: Id
  recipeName: string // snapshot, por si la receta cambia después
  status: BatchStatus

  brewDate: string
  transferDate?: string
  packageDate?: string

  mashSteps: MashStep[]
  mashPh?: number

  preBoilVolumeL?: number
  postBoilVolumeL?: number
  measuredEfficiencyPct?: number

  og?: number
  fg?: number

  yeastHarvestId?: Id

  fermentationLogs: FermentationLogEntry[]

  // snapshot escalado de la receta al momento de cocinar
  fermentables: RecipeFermentable[]
  hops: RecipeHop[]
  adjuncts: RecipeAdjunct[]
  batchVolumeL: number

  costOverrides?: BatchCostOverrides

  notes?: string
  photoBlob?: Blob

  /** true una vez que se descontó el stock de inventario para esta cocción */
  stockDeducted?: boolean

  brewSession?: BrewSession
}

// ---------- Levaduras ----------

export type YeastType = "ale" | "lager" | "salvaje" | "mixta"

export interface YeastStrain extends BaseEntity {
  name: string
  lab?: string
  type: YeastType
  attenuationPct?: number
  notes?: string
  archived?: boolean
}

export interface YeastHarvest extends BaseEntity {
  strainId: Id
  strainName: string
  generation: number
  harvestDate: string
  viabilityPct: number
  sourceBatchId?: Id
  discarded?: boolean
  notes?: string
}

// ---------- Inventario ----------

export type InventoryCategory = "malta" | "lupulo" | "adjunto" | "otro"

export interface InventoryItem extends BaseEntity {
  category: InventoryCategory
  name: string
  unit: "kg" | "g" | "unidad" | "L"
  stockQty: number
  minStockQty: number
  costPerUnit: number
  notes?: string
  archived?: boolean
}

export type InventoryTransactionType = "compra" | "consumo" | "ajuste"

export interface InventoryTransaction extends BaseEntity {
  itemId: Id
  itemName: string
  type: InventoryTransactionType
  /** positivo = entra stock, negativo = sale stock */
  deltaQty: number
  batchId?: Id
  note?: string
}

// ---------- Barriles ----------

export type KegStatus =
  | "vacio_sucio"
  | "limpio"
  | "lleno"
  | "carbonatando"
  | "listo"
  | "en_evento"
  | "devuelto"

export const KEG_STATUS_ORDER: KegStatus[] = [
  "vacio_sucio",
  "limpio",
  "lleno",
  "carbonatando",
  "listo",
  "en_evento",
  "devuelto",
]

export interface KegLocationEntry {
  location: string
  since: string // ISO
}

export const KEG_CAPACITY_OPTIONS_L = [5, 10, 20, 30, 50, 70] as const
export type KegCapacityL = (typeof KEG_CAPACITY_OPTIONS_L)[number]

export interface KegHistoryEntry {
  id: Id
  batchId: Id
  batchCode: string
  filledDate: string
}

export interface Keg extends BaseEntity {
  physicalLabel: string
  capacityL: KegCapacityL
  status: KegStatus
  currentBatchId?: Id
  currentBatchCode?: string
  filledDate?: string
  estimatedRemainingL?: number
  location: string
  locationSince: string
  notes?: string
  /** qué lotes pasaron por este barril, más reciente primero. Opcional: los barriles creados antes de esta
   *  feature no lo tienen — tratarlo siempre como `keg.history ?? []`. */
  history?: KegHistoryEntry[]
}

// ---------- Eventos ----------

export type EventPaymentStatus = "sin_seña" | "señado" | "pagado"

export interface ChecklistItem {
  id: Id
  label: string
  done: boolean
}

export interface Event extends BaseEntity {
  name: string
  date: string
  client: string
  venue: string
  guestCount: number
  litersPerAdultOverride?: number
  assignedKegIds: Id[]
  budget: number
  deposit: number
  paymentStatus: EventPaymentStatus
  checklist: ChecklistItem[]
  notes?: string
}

// ---------- Reseñas (portal público, cargadas a mano) ----------

export type ReviewSource = "whatsapp" | "manual"

export interface Review extends BaseEntity {
  batchId: Id
  batchCode: string
  style: string
  rating: number // 1-5
  comment?: string
  source: ReviewSource
}

// ---------- Configuración ----------

export interface AppSettings {
  id: "settings"
  hourlyRate: number
  defaultGasCost: number
  defaultSanitizerCost: number
  defaultEfficiencyPct: number
  defaultBatchVolumeL: number
  litersPerAdult: number
  kegAmortizationPerLiter: number
  targetMarginPct: number
  fermenterCount: number
  /** base URL donde se sube el HTML del portal público, ej. https://usuario.github.io/saintbier/b */
  publicPortalBaseUrl?: string
  /** número de WhatsApp del operario en formato E.164 sin "+", para los links wa.me */
  whatsappPhone?: string
  instagramHandle?: string
  brandStory?: string
}
