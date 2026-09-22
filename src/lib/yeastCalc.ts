import { differenceInCalendarDays } from "date-fns"
import type { YeastType } from "@/data/types"

/** Millones de células por mL de mosto por °Plato — regla práctica estándar de pitching. */
function pitchRateFor(type: YeastType): number {
  return type === "lager" ? 1.5 : 0.75
}

/** Aproximación lineal de °Plato a partir de la densidad original (suficientemente precisa en el rango cervecero habitual). */
export function sgToPlato(sg: number): number {
  return (sg - 1) * 250
}

/** Densidad de células asumida en una cosecha/slurry de levadura, en células por mL, a viabilidad 100%. */
const ASSUMED_SLURRY_CELLS_PER_ML = 1e9

export interface PitchDoseInput {
  volumeL: number
  og: number
  yeastType: YeastType
  viabilityPct: number
}

export interface PitchDoseResult {
  targetCellsBillions: number
  requiredSlurryMl: number
  requiredSlurryL: number
}

/** Dosis de inoculación (mL de cosecha/slurry) según volumen, DO objetivo y viabilidad medida. */
export function calcPitchDose(input: PitchDoseInput): PitchDoseResult {
  const plato = sgToPlato(input.og)
  const rate = pitchRateFor(input.yeastType)
  const volumeMl = input.volumeL * 1000

  const targetCellsMillions = rate * volumeMl * plato
  const targetCellsBillions = targetCellsMillions / 1000

  const effectiveCellsPerMl = ASSUMED_SLURRY_CELLS_PER_ML * Math.max(0.01, input.viabilityPct / 100)
  const requiredSlurryMl = (targetCellsMillions * 1e6) / effectiveCellsPerMl

  return {
    targetCellsBillions,
    requiredSlurryMl,
    requiredSlurryL: requiredSlurryMl / 1000,
  }
}

const STALE_HARVEST_DAYS = 14
const HIGH_GENERATION = 6

export function harvestAgeDays(harvestDate: string): number {
  return differenceInCalendarDays(new Date(), new Date(harvestDate))
}

export function isHarvestStale(harvestDate: string): boolean {
  return harvestAgeDays(harvestDate) > STALE_HARVEST_DAYS
}

export function isGenerationHigh(generation: number): boolean {
  return generation > HIGH_GENERATION
}
