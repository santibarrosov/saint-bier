import { db } from "../db"
import type { Keg, KegStatus } from "../types"
import { newId, nowIso } from "@/lib/id"

export type KegInput = Omit<Keg, "id" | "createdAt" | "updatedAt" | "history">

export const kegRepo = {
  async list(): Promise<Keg[]> {
    return db.kegs.orderBy("physicalLabel").toArray()
  },

  async get(id: string): Promise<Keg | undefined> {
    return db.kegs.get(id)
  },

  async create(input: KegInput): Promise<Keg> {
    const now = nowIso()
    const keg: Keg = { ...input, id: newId(), createdAt: now, updatedAt: now, history: [] }
    await db.kegs.add(keg)
    return keg
  },

  async update(id: string, patch: Partial<KegInput>): Promise<void> {
    await db.kegs.update(id, { ...patch, updatedAt: nowIso() })
  },

  async remove(id: string): Promise<void> {
    await db.kegs.delete(id)
  },

  /**
   * Cambia el estado y, opcionalmente, la ubicación (registrando desde cuándo). Cuando se
   * asocia un lote nuevo (típicamente al pasar a "lleno"), agrega una entrada al historial
   * del barril — para eso lee el estado fresco dentro de una transacción, no un valor de
   * closure, así dos escrituras casi simultáneas no se pisan (mismo patrón que brewSession).
   */
  async setStatus(
    id: string,
    status: KegStatus,
    opts?: { location?: string; batchId?: string; batchCode?: string; filledDate?: string; remainingL?: number },
  ): Promise<void> {
    await db.transaction("rw", db.kegs, async () => {
      const keg = await db.kegs.get(id)
      if (!keg) return

      const patch: Partial<Keg> = { status, updatedAt: nowIso() }
      if (opts?.location) {
        patch.location = opts.location
        patch.locationSince = nowIso()
      }
      if (opts?.batchId !== undefined) patch.currentBatchId = opts.batchId
      if (opts?.batchCode !== undefined) patch.currentBatchCode = opts.batchCode
      if (opts?.filledDate !== undefined) patch.filledDate = opts.filledDate
      if (opts?.remainingL !== undefined) patch.estimatedRemainingL = opts.remainingL

      if (opts?.batchId && opts.batchId !== keg.currentBatchId) {
        const entry = {
          id: newId(),
          batchId: opts.batchId,
          batchCode: opts.batchCode ?? "",
          filledDate: opts.filledDate ?? nowIso(),
        }
        patch.history = [entry, ...(keg.history ?? [])]
      }

      await db.kegs.update(id, patch)
    })
  },

  async moveLocation(id: string, location: string): Promise<void> {
    await db.kegs.update(id, { location, locationSince: nowIso(), updatedAt: nowIso() })
  },
}
