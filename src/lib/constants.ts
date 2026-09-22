import type {
  BatchStatus,
  EventPaymentStatus,
  FermentableType,
  HopUse,
  InventoryCategory,
  KegStatus,
  YeastType,
} from "@/data/types"

export const BEER_STYLES = [
  "American Pale Ale",
  "IPA",
  "New England IPA",
  "Golden/Blonde Ale",
  "Amber Ale",
  "Brown Ale",
  "Porter",
  "Stout",
  "Saison",
  "Belgian Dubbel",
  "Belgian Tripel",
  "Witbier",
  "Kölsch",
  "Vienna Lager",
  "Pilsner",
  "Scotch Ale",
  "Barleywine",
  "Sour / Wild",
  "Otro",
]

export const FERMENTABLE_TYPE_LABELS: Record<FermentableType, string> = {
  malta_base: "Malta base",
  malta_especial: "Malta especial",
  azucar: "Azúcar",
  extracto: "Extracto",
  otro: "Otro",
}

export const HOP_USE_LABELS: Record<HopUse, string> = {
  hervor: "Hervor",
  whirlpool: "Whirlpool",
  dry_hop: "Dry hop",
  primera_wort: "Primer mosto",
}

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  planificada: "Planificada",
  cociendo: "Cociendo",
  fermentando: "Fermentando",
  madurando: "Madurando",
  carbonatando: "Carbonatando",
  envasada: "Envasada",
  finalizada: "Finalizada",
}

export const BATCH_STATUS_ORDER: BatchStatus[] = [
  "planificada",
  "cociendo",
  "fermentando",
  "madurando",
  "carbonatando",
  "envasada",
  "finalizada",
]

export const KEG_STATUS_LABELS: Record<KegStatus, string> = {
  vacio_sucio: "Vacío sucio",
  limpio: "Limpio",
  lleno: "Lleno",
  carbonatando: "Carbonatando",
  listo: "Listo",
  en_evento: "En evento",
  devuelto: "Devuelto",
}

export const KEG_STATUS_COLOR_VAR: Record<KegStatus, string> = {
  vacio_sucio: "var(--color-keg-dirty)",
  limpio: "var(--color-keg-clean)",
  lleno: "var(--color-keg-full)",
  carbonatando: "var(--color-keg-carb)",
  listo: "var(--color-keg-ready)",
  en_evento: "var(--color-keg-event)",
  devuelto: "var(--color-keg-return)",
}

/** Siguiente estado sugerido en el flujo normal del barril (para el botón de acción principal). */
export const KEG_NEXT_STATUS: Record<KegStatus, KegStatus | null> = {
  vacio_sucio: "limpio",
  limpio: "lleno",
  lleno: "carbonatando",
  carbonatando: "listo",
  listo: "en_evento",
  en_evento: "devuelto",
  devuelto: "vacio_sucio",
}

export const EVENT_PAYMENT_STATUS_LABELS: Record<EventPaymentStatus, string> = {
  "sin_seña": "Sin seña",
  "señado": "Señado",
  pagado: "Pagado",
}

export const INVENTORY_CATEGORY_LABELS: Record<InventoryCategory, string> = {
  malta: "Malta",
  lupulo: "Lúpulo",
  adjunto: "Adjunto",
  otro: "Otro",
}

export const YEAST_TYPE_LABELS: Record<YeastType, string> = {
  ale: "Ale",
  lager: "Lager",
  salvaje: "Salvaje",
  mixta: "Mixta",
}

export const DEFAULT_EVENT_CHECKLIST = [
  "Barriles cargados",
  "CO₂ cargado y con repuesto",
  "Jockey box / chopera armada",
  "Hielo",
  "Vasos",
  "Herramientas y repuestos",
  "Cobro / seña confirmada",
]
