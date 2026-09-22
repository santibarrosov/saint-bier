import { z } from "zod"

export const fermentableFormSchema = z.object({
  inventoryItemId: z.string().optional(),
  name: z.string().min(1, "Requerido"),
  type: z.enum(["malta_base", "malta_especial", "azucar", "extracto", "otro"]),
  amountKg: z.coerce.number().min(0),
  potentialPpg: z.coerce.number().min(0),
  colorLovibond: z.coerce.number().min(0),
})

export const hopFormSchema = z.object({
  inventoryItemId: z.string().optional(),
  name: z.string().min(1, "Requerido"),
  alphaAcidPct: z.coerce.number().min(0).max(100),
  amountG: z.coerce.number().min(0),
  use: z.enum(["hervor", "whirlpool", "dry_hop", "primera_wort"]),
  timeMin: z.coerce.number().min(0),
})

export const adjunctFormSchema = z.object({
  inventoryItemId: z.string().optional(),
  name: z.string().min(1, "Requerido"),
  amountKg: z.coerce.number().min(0),
  potentialPpg: z.coerce.number().min(0),
  timing: z.string().min(1, "Requerido"),
})

export const recipeFormSchema = z.object({
  name: z.string().min(1, "Ponele un nombre a la receta"),
  style: z.string().min(1, "Elegí un estilo"),
  targetVolumeL: z.coerce.number().positive("Tiene que ser mayor a 0"),
  efficiencyPct: z.coerce.number().min(1).max(100),
  yeastStrainId: z.string().optional(),
  plannedFermentationDays: z.coerce.number().min(0),
  plannedConditioningDays: z.coerce.number().min(0),
  plannedCarbonationDays: z.coerce.number().min(0),
  boilTimeMin: z.coerce.number().min(0),
  targetOg: z.coerce.number().min(0.98).max(1.2),
  targetFg: z.coerce.number().min(0.98).max(1.2),
  targetAbv: z.coerce.number().min(0),
  targetIbu: z.coerce.number().min(0),
  targetSrm: z.coerce.number().min(0),
  notes: z.string().optional(),
  publicTastingNote: z.string().optional(),
  publicIngredientsNote: z.string().optional(),
  fermentables: z.array(fermentableFormSchema),
  hops: z.array(hopFormSchema),
  adjuncts: z.array(adjunctFormSchema),
})

export type RecipeFormValues = z.infer<typeof recipeFormSchema>

export const DEFAULT_RECIPE_VALUES: RecipeFormValues = {
  name: "",
  style: "American Pale Ale",
  targetVolumeL: 100,
  efficiencyPct: 70,
  yeastStrainId: undefined,
  plannedFermentationDays: 14,
  plannedConditioningDays: 7,
  plannedCarbonationDays: 3,
  boilTimeMin: 60,
  targetOg: 1.05,
  targetFg: 1.012,
  targetAbv: 5,
  targetIbu: 30,
  targetSrm: 8,
  notes: "",
  publicTastingNote: "",
  publicIngredientsNote: "",
  fermentables: [],
  hops: [],
  adjuncts: [],
}
