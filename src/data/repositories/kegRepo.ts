import { db } from "../db"
import type { Keg, KegStatus } from "../types"
import { newId, nowIso } from "@/lib/id"

export type KegInput = Omit<Keg, "id" | "createdAt" | "updatedAt">

export const kegRepo = {
  async list(): Promise<Keg[]> {
    return db.kegs.orderBy("physicalLabel").toArray()
  },

  async get(id: string): Promise<Keg | undefined> {
    return db.kegs.get(id)
  },

  async create(input: KegInput): Promise<Keg> {
    const now = nowIso()
    const keg: Keg = { ...input, id: newId(), createdAt: now, updatedAt: now }
    await db.kegs.add(keg)
    return keg
  },

  async update(id: string, patch: Partial<KegInput>): Promise<void> {
    await db.kegs.update(id, { ...patch, updatedAt: nowIso() })
  },

  async remove(id: string): Promise<void> {
    await db.kegs.delete(id)
  },

  /** Cambia el estado y, opcionalmente, la ubicación (registrando desde cuándo). */
  async setStatus(
    id: string,
    status: KegStatus,
    opts?: { location?: string; batchId?: string; batchCode?: string; filledDate?: string; remainingL?: number },
  ): Promise<void> {
    const patch: Partial<Keg> = { status, updatedAt: nowIso() }
    if (opts?.location) {
      patch.location = opts.location
      patch.locationSince = nowIso()
    }
    if (opts?.batchId !== undefined) patch.currentBatchId = opts.batchId
    if (opts?.batchCode !== undefined) patch.currentBatchCode = opts.batchCode
    if (opts?.filledDate !== undefined) patch.filledDate = opts.filledDate
    if (opts?.remainingL !== undefined) patch.estimatedRemainingL = opts.remainingL
    await db.kegs.update(id, patch)
  },

  async moveLocation(id: string, location: string): Promise<void> {
    await db.kegs.update(id, { location, locationSince: nowIso(), updatedAt: nowIso() })
  },
}
