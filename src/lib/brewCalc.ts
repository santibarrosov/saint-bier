import { newId } from "@/lib/id"
import type { FermentableType, HopUse, Recipe, RecipeAdjunct, RecipeFermentable, RecipeHop } from "@/data/types"

/** Factor de conversión kg·L → lb·gal usado en las fórmulas clásicas de cervecería (imperiales). */
const METRIC_BREWING_CONSTANT = 8.3454

/** La eficiencia de macerado solo aplica a granos que efectivamente se macerán. */
const EFFICIENCY_APPLIES: Record<FermentableType, boolean> = {
  malta_base: true,
  malta_especial: true,
  azucar: false,
  extracto: false,
  otro: false,
}

export interface GravityInput {
  fermentables: Pick<RecipeFermentable, "amountKg" | "potentialPpg" | "type">[]
  adjuncts: Pick<RecipeAdjunct, "amountKg" | "potentialPpg">[]
  volumeL: number
  efficiencyPct: number
}

/** Densidad original estimada a partir del grain bill. */
export function calcOG(input: GravityInput): number {
  if (input.volumeL <= 0) return 1
  const fermentablePoints = input.fermentables.reduce((sum, f) => {
    const effFactor = EFFICIENCY_APPLIES[f.type] ? input.efficiencyPct / 100 : 1
    return sum + f.amountKg * f.potentialPpg * effFactor
  }, 0)
  const adjunctPoints = input.adjuncts.reduce((sum, a) => sum + a.amountKg * a.potentialPpg, 0)
  const gravityPoints = ((fermentablePoints + adjunctPoints) * METRIC_BREWING_CONSTANT) / input.volumeL
  return 1 + gravityPoints / 1000
}

/** Densidad final estimada a partir de la DO y la atenuación aparente de la levadura. */
export function calcFG(og: number, attenuationPct: number): number {
  return 1 + (og - 1) * (1 - attenuationPct / 100)
}

/** ABV por la fórmula estándar (simple, ampliamente usada en homebrewing). */
export function calcABV(og: number, fg: number): number {
  return (og - fg) * 131.25
}

/** Atenuación aparente real (%), a partir de DO/DF medidas. */
export function calcAttenuation(og: number, fg: number): number {
  if (og <= 1) return 0
  return ((og - fg) / (og - 1)) * 100
}

/**
 * Eficiencia de macerado real, a partir de la DO medida en el día de cocción.
 * Resta el aporte de azúcares/extractos (que no dependen del macerado, siempre ~100%)
 * y compara los puntos de gravedad restantes contra el máximo teórico del grano macerado.
 */
export function calcMeasuredEfficiency(
  fermentables: Pick<RecipeFermentable, "amountKg" | "potentialPpg" | "type">[],
  adjuncts: Pick<RecipeAdjunct, "amountKg" | "potentialPpg">[],
  actualVolumeL: number,
  measuredOg: number,
): number {
  if (actualVolumeL <= 0) return 0

  const mashPointsAt100 = fermentables
    .filter((f) => EFFICIENCY_APPLIES[f.type])
    .reduce((sum, f) => sum + f.amountKg * f.potentialPpg, 0)
  const nonMashPoints = [
    ...fermentables.filter((f) => !EFFICIENCY_APPLIES[f.type]),
    ...adjuncts,
  ].reduce((sum, f) => sum + f.amountKg * f.potentialPpg, 0)

  const theoreticalMashPoints = (mashPointsAt100 * METRIC_BREWING_CONSTANT) / actualVolumeL
  if (theoreticalMashPoints <= 0) return 0

  const nonMashActualPoints = (nonMashPoints * METRIC_BREWING_CONSTANT) / actualVolumeL
  const actualTotalPoints = (measuredOg - 1) * 1000
  const actualMashPoints = actualTotalPoints - nonMashActualPoints

  return Math.max(0, (actualMashPoints / theoreticalMashPoints) * 100)
}

export interface IbuHopInput {
  amountG: number
  alphaAcidPct: number
  timeMin: number
  use: HopUse
}

/**
 * IBU por la fórmula de Tinseth. IBU se define como mg/L de ácidos alfa isomerizados,
 * por eso alpha_mg_por_L × utilización da directamente el aporte en IBU.
 * El whirlpool se aproxima con un factor de utilización reducido (menor temperatura que hervor pleno);
 * el dry hop no aporta amargor (no hay isomerización).
 */
export function calcIBU(hops: IbuHopInput[], volumeL: number, og: number): number {
  if (volumeL <= 0) return 0
  const bignessFactor = 1.65 * 0.000125 ** (og - 1)

  return hops.reduce((total, hop) => {
    if (hop.use === "dry_hop") return total
    const boilTimeFactor = (1 - Math.exp(-0.04 * hop.timeMin)) / 4.15
    let utilization = bignessFactor * boilTimeFactor
    if (hop.use === "whirlpool") utilization *= 0.5

    const alphaMgPerL = (hop.amountG * (hop.alphaAcidPct / 100) * 1000) / volumeL
    return total + alphaMgPerL * utilization
  }, 0)
}

/** SRM por la ecuación de Morey. */
export function calcSRM(fermentables: Pick<RecipeFermentable, "amountKg" | "colorLovibond">[], volumeL: number): number {
  if (volumeL <= 0) return 0
  const mcu = (fermentables.reduce((sum, f) => sum + f.amountKg * f.colorLovibond, 0) * METRIC_BREWING_CONSTANT) / volumeL
  if (mcu <= 0) return 0
  return 1.4922 * mcu ** 0.6859
}

export interface RecipeStats {
  og: number
  fg: number
  abv: number
  ibu: number
  srm: number
}

export function calcRecipeStats(
  data: {
    fermentables: RecipeFermentable[]
    hops: RecipeHop[]
    adjuncts: RecipeAdjunct[]
    targetVolumeL: number
    efficiencyPct: number
  },
  attenuationPct = 75,
): RecipeStats {
  const og = calcOG({
    fermentables: data.fermentables,
    adjuncts: data.adjuncts,
    volumeL: data.targetVolumeL,
    efficiencyPct: data.efficiencyPct,
  })
  const fg = calcFG(og, attenuationPct)
  const abv = calcABV(og, fg)
  const ibu = calcIBU(data.hops, data.targetVolumeL, og)
  const srm = calcSRM(data.fermentables, data.targetVolumeL)
  return { og, fg, abv, ibu, srm }
}

/**
 * Escala una receta a un nuevo volumen y/o eficiencia.
 * Los fermentables macerados se ajustan por volumen Y eficiencia (si tu eficiencia real
 * es menor a la de referencia, hace falta más grano para llegar a la misma densidad).
 * Azúcares/extractos, adjuntos y lúpulos escalan solo por volumen (mantiene concentración = IBU objetivo).
 */
export function scaleRecipe(
  recipe: Pick<Recipe, "targetVolumeL" | "efficiencyPct" | "fermentables" | "hops" | "adjuncts">,
  targetVolumeL: number,
  targetEfficiencyPct: number,
): { fermentables: RecipeFermentable[]; hops: RecipeHop[]; adjuncts: RecipeAdjunct[] } {
  const volumeRatio = recipe.targetVolumeL > 0 ? targetVolumeL / recipe.targetVolumeL : 1
  const efficiencyRatio = targetEfficiencyPct > 0 ? recipe.efficiencyPct / targetEfficiencyPct : 1

  const fermentables = recipe.fermentables.map((f) => ({
    ...f,
    id: newId(),
    amountKg: round3(f.amountKg * volumeRatio * (EFFICIENCY_APPLIES[f.type] ? efficiencyRatio : 1)),
  }))
  const hops = recipe.hops.map((h) => ({
    ...h,
    id: newId(),
    amountG: round3(h.amountG * volumeRatio),
  }))
  const adjuncts = recipe.adjuncts.map((a) => ({
    ...a,
    id: newId(),
    amountKg: round3(a.amountKg * volumeRatio),
  }))

  return { fermentables, hops, adjuncts }
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}
