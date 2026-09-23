import { db } from "../db"
import type { Recipe } from "../types"
import { newId, nowIso } from "@/lib/id"

export type RecipeInput = Omit<Recipe, "id" | "createdAt" | "updatedAt">

export const recipeRepo = {
  async list(): Promise<Recipe[]> {
    return db.recipes.orderBy("updatedAt").reverse().toArray()
  },

  async get(id: string): Promise<Recipe | undefined> {
    return db.recipes.get(id)
  },

  async create(input: RecipeInput): Promise<Recipe> {
    const now = nowIso()
    const recipe: Recipe = { ...input, id: newId(), createdAt: now, updatedAt: now }
    await db.recipes.add(recipe)
    return recipe
  },

  async update(id: string, patch: Partial<RecipeInput>): Promise<void> {
    await db.recipes.update(id, { ...patch, updatedAt: nowIso() })
  },

  async archive(id: string): Promise<void> {
    await db.recipes.update(id, { archived: true, updatedAt: nowIso() })
  },

  async remove(id: string): Promise<void> {
    await db.recipes.delete(id)
  },

  /** Copia la receta con nombre "(copia)" e ids frescos en los ingredientes, para iterar sin tocar el original. */
  async duplicate(recipe: Recipe): Promise<Recipe> {
    return recipeRepo.create({
      name: `${recipe.name} (copia)`,
      style: recipe.style,
      targetVolumeL: recipe.targetVolumeL,
      efficiencyPct: recipe.efficiencyPct,
      targets: { ...recipe.targets },
      fermentables: recipe.fermentables.map((f) => ({ ...f, id: newId() })),
      hops: recipe.hops.map((h) => ({ ...h, id: newId() })),
      adjuncts: recipe.adjuncts.map((a) => ({ ...a, id: newId() })),
      yeastStrainId: recipe.yeastStrainId,
      plannedFermentationDays: recipe.plannedFermentationDays,
      plannedConditioningDays: recipe.plannedConditioningDays,
      plannedCarbonationDays: recipe.plannedCarbonationDays,
      boilTimeMin: recipe.boilTimeMin,
      publicTastingNote: recipe.publicTastingNote,
      publicIngredientsNote: recipe.publicIngredientsNote,
      notes: recipe.notes,
      archived: false,
    })
  },
}
