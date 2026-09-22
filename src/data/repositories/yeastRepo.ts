import { db } from "../db"
import type { YeastHarvest, YeastStrain } from "../types"
import { newId, nowIso } from "@/lib/id"

export type YeastStrainInput = Omit<YeastStrain, "id" | "createdAt" | "updatedAt">
export type YeastHarvestInput = Omit<YeastHarvest, "id" | "createdAt" | "updatedAt">

export const yeastRepo = {
  async listStrains(): Promise<YeastStrain[]> {
    return db.yeastStrains.orderBy("name").toArray()
  },

  async createStrain(input: YeastStrainInput): Promise<YeastStrain> {
    const now = nowIso()
    const strain: YeastStrain = { ...input, id: newId(), createdAt: now, updatedAt: now }
    await db.yeastStrains.add(strain)
    return strain
  },

  async updateStrain(id: string, patch: Partial<YeastStrainInput>): Promise<void> {
    await db.yeastStrains.update(id, { ...patch, updatedAt: nowIso() })
  },

  async archiveStrain(id: string): Promise<void> {
    await db.yeastStrains.update(id, { archived: true, updatedAt: nowIso() })
  },

  async listHarvests(): Promise<YeastHarvest[]> {
    return db.yeastHarvests.orderBy("harvestDate").reverse().toArray()
  },

  async getHarvest(id: string): Promise<YeastHarvest | undefined> {
    return db.yeastHarvests.get(id)
  },

  async createHarvest(input: YeastHarvestInput): Promise<YeastHarvest> {
    const now = nowIso()
    const harvest: YeastHarvest = { ...input, id: newId(), createdAt: now, updatedAt: now }
    await db.yeastHarvests.add(harvest)
    return harvest
  },

  async updateHarvest(id: string, patch: Partial<YeastHarvestInput>): Promise<void> {
    await db.yeastHarvests.update(id, { ...patch, updatedAt: nowIso() })
  },

  async discardHarvest(id: string): Promise<void> {
    await db.yeastHarvests.update(id, { discarded: true, updatedAt: nowIso() })
  },

  async remove(id: string): Promise<void> {
    await db.yeastHarvests.delete(id)
  },
}
